import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { getMediaUrl, deleteFiles } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)

    const media = await prisma.media.findUnique({
      where: { id: params.id },
      include: {
        event: { include: { club: { select: { id: true, name: true } } } },
        uploader: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, downloads: true } },
        photoTags: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    })
    if (!media) throw new NotFoundError('Media not found')

    let liked = false
    let favourited = false
    if (user) {
      const [like, fav] = await Promise.all([
        prisma.like.findUnique({
          where: { userId_mediaId: { userId: user.sub, mediaId: params.id } },
        }),
        prisma.favourite.findUnique({
          where: { userId_mediaId: { userId: user.sub, mediaId: params.id } },
        }),
      ])
      liked = !!like
      favourited = !!fav
    }

    return NextResponse.json({
      id: media.id,
      eventId: media.eventId,
      event: media.event,
      uploader: media.uploader,
      mediaType: media.mediaType,
      signedUrl: getMediaUrl(media.compressedUrl),
      originalUrl: getMediaUrl(media.originalUrl),
      thumbSmUrl: getMediaUrl(media.thumbSmUrl),
      thumbMdUrl: getMediaUrl(media.thumbMdUrl),
      width: media.width,
      height: media.height,
      tags: media.tags,
      caption: media.caption,
      likesCount: (media as any)._count.likes,
      commentsCount: (media as any)._count.comments,
      downloadsCount: (media as any)._count.downloads,
      liked,
      favourited,
      taggedUsers: (media as any).photoTags.map((t: any) => t.user),
      uploadedAt: media.uploadedAt.toISOString(),
    })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)

    const media = await prisma.media.findUnique({
      where: { id: params.id },
      include: { event: { select: { clubId: true } } },
    })
    if (!media) throw new NotFoundError('Media not found')

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: media.event.clubId, userId: user.sub } },
    })
    const isUploader = media.uploaderId === user.sub
    const isAdmin = membership?.role === 'admin'
    if (!isUploader && !isAdmin) throw new ForbiddenError('Forbidden')

    const keys = [media.originalUrl, media.compressedUrl, media.thumbSmUrl, media.thumbMdUrl].filter(
      Boolean
    ) as string[]
    await deleteFiles(keys)
    await prisma.media.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
