import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const createClubSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)

    if (user.globalRole !== 'admin') {
      throw new ForbiddenError('Only global admins can create clubs')
    }

    const body = await request.json()
    const validated = createClubSchema.parse(body)

    const club = await prisma.$transaction(async (tx) => {
      const newClub = await tx.club.create({
        data: {
          name: validated.name,
          description: validated.description ?? null,
          logoUrl: validated.logoUrl ?? null,
          createdBy: user.sub,
        },
      })
      await tx.clubMember.create({
        data: { clubId: newClub.id, userId: user.sub, role: 'admin' },
      })
      return newClub
    })

    return NextResponse.json(club, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
