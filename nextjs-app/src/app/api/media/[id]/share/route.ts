import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const mediaId = params.id

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { event: { select: { id: true, visibility: true, clubId: true } } },
    })
    if (!media) throw new NotFoundError('Media not found')

    if (media.event.visibility === 'private') {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: media.event.clubId, userId: user.sub } },
      })
      if (!membership) throw new ForbiddenError('Forbidden')
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      url: `${appUrl}/events/${media.event.id}?photo=${mediaId}`,
    })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
