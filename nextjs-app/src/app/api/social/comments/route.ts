/**
 * POST /api/social/comments      — add comment
 * PATCH /api/social/comments     — edit comment  (body: { commentId, text })
 * DELETE /api/social/comments    — delete comment (body: { commentId })
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/errors'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'

const addSchema = z.object({
  mediaId: z.string().uuid(),
  text: z.string().min(1).max(500),
  parentId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const body = await request.json()
    const validated = addSchema.parse(body)

    const media = await prisma.media.findUnique({ where: { id: validated.mediaId }, select: { id: true } })
    if (!media) throw new NotFoundError('Media not found')

    const sanitized = sanitizeHtml(validated.text, { allowedTags: [], allowedAttributes: {} })

    if (validated.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: validated.parentId },
        select: { id: true, parentId: true },
      })
      if (!parent) throw new BadRequestError('Parent comment not found')
      if (parent.parentId !== null) throw new BadRequestError('Reply to reply not allowed')
    }

    const comment = await prisma.comment.create({
      data: {
        mediaId: validated.mediaId,
        userId: user.sub,
        parentId: validated.parentId ?? null,
        text: sanitized,
      },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { commentId, text } = await request.json() as { commentId: string; text: string }

    if (!text || typeof text !== 'string' || text.length < 1 || text.length > 500) {
      throw new BadRequestError('Comment text must be 1-500 characters')
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!comment) throw new NotFoundError('Comment not found')
    if (comment.userId !== user.sub) throw new ForbiddenError('Forbidden')

    const fiveMinutes = 5 * 60 * 1000
    if (Date.now() - comment.createdAt.getTime() > fiveMinutes) {
      throw new ForbiddenError('Edit window has closed')
    }

    const sanitized = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { text: sanitized, updatedAt: new Date() },
    })
    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { commentId } = await request.json() as { commentId: string }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { media: { include: { event: { select: { clubId: true } } } } },
    })
    if (!comment) throw new NotFoundError('Comment not found')

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: comment.media.event.clubId, userId: user.sub } },
      select: { role: true },
    })
    const isAuthor = comment.userId === user.sub
    const isClubAdmin = membership?.role === 'admin'
    if (!isAuthor && !isClubAdmin) throw new ForbiddenError('Forbidden')

    await prisma.comment.delete({ where: { id: commentId } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
