import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'
import { getMediaUrl } from '@/lib/storage'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '24')))

    const where = {
      OR: [{ uploaderId: user.sub }, { photoTags: { some: { userId: user.sub } } }],
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          event: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.media.count({ where }),
    ])

    const eventIds = new Set(media.map((m) => m.eventId))
    const items = media.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      eventName: (m as any).event.name,
      uploaderId: m.uploaderId,
      mediaType: m.mediaType,
      signedUrl: getMediaUrl(m.compressedUrl),
      thumbSmUrl: getMediaUrl(m.thumbSmUrl),
      thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      likesCount: (m as any)._count.likes,
      commentsCount: (m as any)._count.comments,
      tags: m.tags,
      uploadedAt: m.uploadedAt.toISOString(),
    }))

    return NextResponse.json({ items, total, eventCount: eventIds.size, page, pageSize })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
