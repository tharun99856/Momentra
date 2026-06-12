import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { getMediaUrl } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)
    const { searchParams } = request.nextUrl

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50')))
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',') : undefined

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, visibility: true, clubId: true },
    })
    if (!event) throw new NotFoundError('Event not found')

    if (event.visibility === 'private') {
      if (!user) throw new ForbiddenError('Forbidden')
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: event.clubId, userId: user.sub } },
      })
      if (!membership) throw new ForbiddenError('Forbidden')
    }

    const where: Record<string, unknown> = { eventId: params.id }
    if (tags) where.tags = { hasSome: tags }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          uploader: { select: { id: true, username: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.media.count({ where }),
    ])

    let userLikes = new Set<string>()
    if (user) {
      const likes = await prisma.like.findMany({
        where: { userId: user.sub, mediaId: { in: media.map((m) => m.id) } },
        select: { mediaId: true },
      })
      userLikes = new Set(likes.map((l) => l.mediaId))
    }

    const data = media.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      uploaderId: m.uploaderId,
      uploaderName: (m as any).uploader.username,
      mediaType: m.mediaType,
      signedUrl: getMediaUrl(m.compressedUrl),
      thumbSmUrl: getMediaUrl(m.thumbSmUrl),
      thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      width: m.width,
      height: m.height,
      tags: m.tags,
      caption: m.caption,
      likesCount: (m as any)._count.likes,
      commentsCount: (m as any)._count.comments,
      liked: userLikes.has(m.id),
      uploadedAt: m.uploadedAt.toISOString(),
    }))

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, hasMore: page * pageSize < total },
    })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
