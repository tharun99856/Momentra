import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { getMediaUrl, getFileBuffer } from '@/lib/storage'
import { applyWatermark } from '@/lib/image-processor'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)

    const media = await prisma.media.findUnique({
      where: { id: params.id },
      include: {
        event: { include: { club: { select: { id: true, name: true } } } },
      },
    })
    if (!media) throw new NotFoundError('Media not found')

    let clubRole: string | null = null

    if (media.event.visibility === 'private') {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: media.event.club.id, userId: user.sub } },
        select: { role: true },
      })
      if (!membership) throw new ForbiddenError('Forbidden')
      clubRole = membership.role
    } else {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: media.event.club.id, userId: user.sub } },
        select: { role: true },
      })
      clubRole = membership?.role ?? null
    }

    if (media.mediaType === 'video') {
      const videoUrl = getMediaUrl(media.originalUrl)
      if (videoUrl) return NextResponse.redirect(videoUrl)
      throw new NotFoundError('Video not found')
    }

    // Works for both local disk and Cloudinary URLs
    const originalBuffer = await getFileBuffer(media.originalUrl)

    const downloader = await prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
      select: { username: true },
    })

    const role = (clubRole ?? 'viewer') as 'admin' | 'photographer' | 'member' | 'viewer'
    const photographerName = role === 'photographer' ? downloader.username : undefined

    const watermarked = await applyWatermark(
      originalBuffer,
      role,
      media.event.club.name,
      media.event.name,
      photographerName
    )

    await prisma.download.create({ data: { userId: user.sub, mediaId: params.id } })

    const filename = `${media.event.name.replace(/[^a-z0-9]/gi, '_')}_${media.id}.jpg`
    return new NextResponse(watermarked, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(watermarked.length),
      },
    })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
