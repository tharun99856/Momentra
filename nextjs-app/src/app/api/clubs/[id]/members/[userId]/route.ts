import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'photographer', 'member']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
): Promise<NextResponse> {
  try {
    const actor = requireAuthUser(request)
    const body = await request.json()
    const validated = updateRoleSchema.parse(body)

    const actorMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: actor.sub } },
    })
    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can update member roles')
    }

    if (actor.sub === params.userId && validated.role !== 'admin') {
      const adminCount = await prisma.clubMember.count({
        where: { clubId: params.id, role: 'admin' },
      })
      if (adminCount <= 1) throw new BadRequestError('Cannot remove the last admin from the club')
    }

    const member = await prisma.clubMember.upsert({
      where: { clubId_userId: { clubId: params.id, userId: params.userId } },
      update: { role: validated.role },
      create: { clubId: params.id, userId: params.userId, role: validated.role },
    })
    return NextResponse.json(member)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
): Promise<NextResponse> {
  try {
    const actor = requireAuthUser(request)

    const actorMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: actor.sub } },
    })
    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can remove members')
    }

    if (actor.sub === params.userId) {
      const adminCount = await prisma.clubMember.count({
        where: { clubId: params.id, role: 'admin' },
      })
      if (adminCount <= 1) throw new BadRequestError('Cannot remove the last admin from the club')
    }

    const member = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: params.userId } },
    })
    if (!member) throw new NotFoundError('Member not found')

    await prisma.clubMember.delete({
      where: { clubId_userId: { clubId: params.id, userId: params.userId } },
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
