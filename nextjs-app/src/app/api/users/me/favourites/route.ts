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

    const [favourites, total] = await Promise.all([
      prisma.favourite.findMany({
        where: { userId: user.sub },
        include: {
          media: {
            include: {
              event: { select: { visibility: true, clubId: true } },
              _count: { select: { likes: true, comments: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.favourite.count({ where: { userId: user.sub } }),
    ])

    const items = favourites.map((fav) => {
      const m = fav.media
      return {
        id: m.id,
        eventId: m.eventId,
        uploaderId: m.uploaderId,
        mediaType: m.mediaType,
        signedUrl: getMediaUrl(m.compressedUrl),
        thumbMdUrl: getMediaUrl(m.thumbMdUrl),
        thumbSmUrl: getMediaUrl(m.thumbSmUrl),
        likesCount: (m as any)._count.likes,
        commentsCount: (m as any)._count.comments,
        tags: m.tags,
        uploadedAt: m.uploadedAt.toISOString(),
      }
    })

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
