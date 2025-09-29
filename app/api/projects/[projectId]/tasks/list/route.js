import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

import { db } from '@/lib/db';
export const runtime = 'nodejs'; // <-- NOT edge
export const maxDuration = 60; // optional: allow longer work
export const dynamic = 'force-dynamic';

// 获取项目的所有任务列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // 可选参数: 任务类型和任务状态
    const taskType = searchParams.get('taskType');
    const statusStr = searchParams.get('status');

    // 分页参数
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 构建查询条件
    const where = { projectId };

    if (taskType) {
      where.taskType = taskType;
    }

    if (statusStr && !isNaN(parseInt(statusStr))) {
      where.status = parseInt(statusStr);
    }

    // 获取任务总数
    const total = await db.task.count({ where });

    // 获取任务列表，按创建时间降序排序，并应用分页
    const tasks = await db.task.findMany({
      where,
      orderBy: {
        createAt: 'desc'
      },
      skip: page * limit,
      take: limit
    });

    return NextResponse.json({
      code: 0,
      data: tasks,
      total,
      page,
      limit,
      message: '任务列表获取成功'
    });
  } catch (error) {
    console.error('获取任务列表失败:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: '获取任务列表失败',
        message: error.message
      },
      { status: 500 }
    );
  }
}
