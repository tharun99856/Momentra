import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: user.sub },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      prisma.notification.count({ where: { recipientId: user.sub } }),
      prisma.notification.count({ where: { recipientId: user.sub, readAt: null } }),
    ])

    return NextResponse.json({ items: notifications, total, unreadCount, page, pageSize })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  // PUT /api/users/me/notifications — mark all as read
  try {
    const user = requireAuthUser(request)
    await prisma.notification.updateMany({
      where: { recipientId: user.sub, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
