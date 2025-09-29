'use server';

import path from 'path';
import { getProjectRoot, readJsonFile, writeJsonFile } from './base';
import { db } from '@/lib/db/index';
import fs from 'fs';

export async function getTags(projectId) {
  try {
    // 1) load all tags for this project (one query)
    const tags = await db.tags.findMany({
      where: { projectId },
      select: { id: true, label: true, parentId: true },
      orderBy: { label: 'asc' } // stable order (optional)
    });

    // 2) load question counts grouped by label (one query)
    // Prisma >=4: groupBy; else use $queryRaw
    const qCounts = await db.questions.groupBy({
      by: ['label'],
      where: { projectId },
      _count: { _all: true }
    });
    const labelCount = new Map(qCounts.map(r => [r.label, r._count._all]));

    // Build adjacency
    const byParent = new Map(); // parentId -> Tag[]
    const byId = new Map();
    for (const t of tags) {
      byId.set(t.id, { ...t, child: [], questionCount: 0 });
      const key = t.parentId ?? '__ROOT__';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(byId.get(t.id));
    }

    // Precompute label -> tagId (assuming labels are unique per project)
    const labelToTagId = new Map(tags.map(t => [t.label, t.id]));

    // Build children links
    for (const t of tags) {
      const node = byId.get(t.id);
      node.child = byParent.get(t.id) ?? [];
    }

    // DFS to compute subtree label sets & counts
    function dfs(node) {
      // Start with this node's own label
      let count = labelCount.get(node.label) || 0;
      for (const c of node.child) count += dfs(c);
      node.questionCount = count;
      return count;
    }

    const roots = byParent.get('__ROOT__') ?? [];
    for (const r of roots) dfs(r);

    return roots; // tree with child[] + questionCount on each node
  } catch (e) {
    console.error('getTags failed:', e);
    return [];
  }
}

// // 获取标签树
// export async function getTags(projectId) {
//   try {
//     return await getTagsTreeWithQuestionCount(projectId);
//   } catch (error) {
//     return [];
//   }
// }

// // 递归查询树状结构，并统计问题数量
// async function getTagsTreeWithQuestionCount(projectId, parentId = null) {
//   // 查询当前层级的分类
//   const tags = await db.tags.findMany({
//     where: { parentId, projectId }
//   });

//   // 遍历每个分类，递归查询子节点
//   for (const tag of tags) {
//     // 获取当前分类及其子分类的所有 label
//     const labels = await getAllLabels(tag.id);

//     // 统计当前分类及其子分类的问题数量
//     // tag.questionCount = await db.questions.count({
//     //   where: { label: { in: labels }, projectId }
//     // });

//     // 递归查询子节点
//     tag.child = await getTagsTreeWithQuestionCount(projectId, tag.id);
//   }

//   return tags;
// }

// // 获取某个分类及其所有子分类的 label
// async function getAllLabels(tagId) {
//   const labels = [];
//   const queue = [tagId];

//   while (queue.length > 0) {
//     const currentId = queue.shift();
//     const tag = await db.tags.findUnique({
//       where: { id: currentId }
//     });

//     if (tag) {
//       labels.push(tag.label);
//       // 获取子分类的 ID，加入队列
//       const children = await db.tags.findMany({
//         where: { parentId: currentId },
//         select: { id: true }
//       });
//       queue.push(...children.map(child => child.id));
//     }
//   }

//   return labels;
// }

export async function createTag(projectId, label, parentId) {
  try {
    let data = {
      projectId,
      label
    };
    if (parentId) {
      data.parentId = parentId;
    }
    return await db.tags.create({ data });
  } catch (error) {
    console.error('Error insert tags db:', error);
    throw error;
  }
}

export async function updateTag(label, id) {
  try {
    return await db.tags.update({ where: { id }, data: { label } });
  } catch (error) {
    console.error('Error update tags db:', error);
    throw error;
  }
}

/**
 * 删除标签及其所有子标签、问题和数据集
 * @param {string} id - 要删除的标签 ID
 * @returns {Promise<object>} 删除结果
 */
export async function deleteTag(id) {
  try {
    console.log(`开始删除标签: ${id}`);

    // 1. 获取要删除的标签
    const tag = await db.tags.findUnique({
      where: { id }
    });

    if (!tag) {
      throw new Error(`标签不存在: ${id}`);
    }

    // 2. 获取所有子标签（所有层级）
    const allChildTags = await getAllChildTags(id, tag.projectId);
    console.log(`找到 ${allChildTags.length} 个子标签需要删除`);

    // 3. 从叶子节点开始删除，防止外键约束问题
    for (const childTag of allChildTags.reverse()) {
      // 删除与标签相关的数据集
      await deleteDatasetsByTag(childTag.label, childTag.projectId);

      // 删除与标签相关的问题
      await deleteQuestionsByTag(childTag.label, childTag.projectId);

      // 删除标签
      await db.tags.delete({ where: { id: childTag.id } });
      console.log(`删除子标签: ${childTag.id} (${childTag.label})`);
    }

    // 4. 删除与当前标签相关的数据集
    await deleteDatasetsByTag(tag.label, tag.projectId);

    // 5. 删除与当前标签相关的问题
    await deleteQuestionsByTag(tag.label, tag.projectId);

    // 6. 删除当前标签
    console.log(`删除主标签: ${id} (${tag.label})`);
    return await db.tags.delete({ where: { id } });
  } catch (error) {
    console.error('删除标签时出错:', error);
    throw error;
  }
}

/**
 * 获取标签的所有子标签（所有层级）
 * @param {string} parentId - 父标签 ID
 * @param {string} projectId - 项目 ID
 * @returns {Promise<Array>} 所有子标签列表
 */
async function getAllChildTags(parentId, projectId) {
  const result = [];

  // 递归获取子标签
  async function fetchChildTags(pid) {
    // 查询直接子标签
    const children = await db.tags.findMany({
      where: {
        parentId: pid,
        projectId
      }
    });

    // 如果有子标签
    if (children.length > 0) {
      // 将子标签添加到结果中
      result.push(...children);

      // 递归获取每个子标签的子标签
      for (const child of children) {
        await fetchChildTags(child.id);
      }
    }
  }

  // 开始递归获取
  await fetchChildTags(parentId);

  return result;
}

/**
 * 删除与标签相关的问题
 * @param {string} label - 标签名称
 * @param {string} projectId - 项目 ID
 */
async function deleteQuestionsByTag(label, projectId) {
  try {
    // 查找并删除与标签相关的所有问题
    await db.questions.deleteMany({
      where: {
        label,
        projectId
      }
    });
  } catch (error) {
    console.error(`删除标签 "${label}" 相关问题时出错:`, error);
    throw error;
  }
}

/**
 * 删除与标签相关的数据集
 * @param {string} label - 标签名称
 * @param {string} projectId - 项目 ID
 */
async function deleteDatasetsByTag(label, projectId) {
  try {
    // 查找并删除与标签相关的所有数据集
    await db.datasets.deleteMany({
      where: {
        questionLabel: label,
        projectId
      }
    });
  } catch (error) {
    console.error(`删除标签 "${label}" 相关数据集时出错:`, error);
    throw error;
  }
}

// 保存整个标签树
export async function batchSaveTags(projectId, tags) {
  try {
    // 仅在入口函数删除所有标签，避免递归中重复删除
    await db.tags.deleteMany({ where: { projectId } });
    // 处理标签树
    await insertTags(projectId, tags);
  } catch (error) {
    console.error('Error insert tags db:', error);
    throw error;
  }
}

async function insertTags(projectId, tags, parentId = null) {
  // 删除操作已移至外层函数，这里不再需要
  for (const tag of tags) {
    // 插入当前节点
    const createdTag = await db.tags.create({
      data: {
        projectId,
        label: tag.label,
        parentId: parentId
      }
    });
    // 如果有子节点，递归插入
    if (tag.child && tag.child.length > 0) {
      await insertTags(projectId, tag.child, createdTag.id);
    }
  }
}
