/**
 * POST /api/social/likes
 * Toggle like on a media item.
 * Body: { mediaId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError } from '@/lib/errors'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { mediaId } = await request.json() as { mediaId: string }

    const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } })
    if (!media) throw new NotFoundError('Media not found')

    const existing = await prisma.like.findUnique({
      where: { userId_mediaId: { userId: user.sub, mediaId } },
    })

    let liked: boolean
    if (existing) {
      await prisma.like.delete({ where: { userId_mediaId: { userId: user.sub, mediaId } } })
      liked = false
    } else {
      await prisma.like.create({ data: { userId: user.sub, mediaId } })
      liked = true
    }

    const count = await prisma.like.count({ where: { mediaId } })
    return NextResponse.json({ liked, count })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
