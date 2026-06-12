import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { mediaId: params.id, parentId: null },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
        },
      }),
      prisma.comment.count({ where: { mediaId: params.id, parentId: null } }),
    ])

    return NextResponse.json({ data: comments, total, page, pageSize })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
