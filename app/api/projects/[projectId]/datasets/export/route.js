import { NextResponse } from 'next/server';
import {
  getDatasets,
  getBalancedDatasetsByTags,
  getTagsWithDatasetCounts,
  getDatasetsBatch,
  getBalancedDatasetsByTagsBatch
} from '@/lib/db/datasets';

/**
 * 获取导出数据集
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    let status = searchParams.get('status');
    let confirmed = undefined;
    if (status === 'confirmed') confirmed = true;
    if (status === 'unconfirmed') confirmed = false;

    // 检查是否是分批导出模式
    const batchMode = searchParams.get('batchMode');
    const offset = parseInt(searchParams.get('offset')) || 0;
    const batchSize = parseInt(searchParams.get('batchSize')) || 1000;

    // 检查是否是平衡导出
    const balanceMode = searchParams.get('balanceMode');
    const balanceConfig = searchParams.get('balanceConfig');

    if (batchMode === 'true') {
      // 分批导出模式
      if (balanceMode === 'true' && balanceConfig) {
        // 平衡分批导出
        const parsedConfig = JSON.parse(balanceConfig);
        const result = await getBalancedDatasetsByTagsBatch(projectId, parsedConfig, confirmed, offset, batchSize);
        return NextResponse.json({
          data: result.data,
          hasMore: result.hasMore,
          offset: offset + result.data.length
        });
      } else {
        // 常规分批导出
        const datasets = await getDatasetsBatch(projectId, confirmed, offset, batchSize);
        const hasMore = datasets.length === batchSize;
        return NextResponse.json({
          data: datasets,
          hasMore,
          offset: offset + datasets.length
        });
      }
    } else {
      // 传统一次性导出模式（保持向后兼容）
      if (balanceMode === 'true' && balanceConfig) {
        // 平衡导出模式
        const parsedConfig = JSON.parse(balanceConfig);
        const datasets = await getBalancedDatasetsByTags(projectId, parsedConfig, confirmed);
        return NextResponse.json(datasets);
      } else {
        // 常规导出模式
        const datasets = await getDatasets(projectId, confirmed);
        return NextResponse.json(datasets);
      }
    }
  } catch (error) {
    console.error('Failed to get datasets:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get datasets'
      },
      { status: 500 }
    );
  }
}

/**
 * 获取标签统计信息
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { confirmed } = body;

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    // 获取标签统计信息
    const tagStats = await getTagsWithDatasetCounts(projectId, confirmed);
    return NextResponse.json(tagStats);
  } catch (error) {
    console.error('Failed to get tag statistics:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get tag statistics'
      },
      { status: 500 }
    );
  }
}
