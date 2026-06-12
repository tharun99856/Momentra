import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const mediaId = params.id

    const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } })
    if (!media) throw new NotFoundError('Media not found')

    const existing = await prisma.favourite.findUnique({
      where: { userId_mediaId: { userId: user.sub, mediaId } },
    })

    let saved: boolean
    if (existing) {
      await prisma.favourite.delete({ where: { userId_mediaId: { userId: user.sub, mediaId } } })
      saved = false
    } else {
      await prisma.favourite.create({ data: { userId: user.sub, mediaId } })
      saved = true
    }

    return NextResponse.json({ saved })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
