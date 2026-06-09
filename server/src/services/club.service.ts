// Club service implementation

import { prisma } from '../lib/prisma.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js'
import type {
  CreateClubDto,
  UpdateClubDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  Club,
  ClubMember,
} from '../types/club.types.js'
import { z } from 'zod'

// Validation schemas
const createClubSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'photographer', 'member']),
})

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'photographer', 'member']),
})

export class ClubService {
  /**
   * Create a new club with the creator as admin
   */
  async create(dto: CreateClubDto, creatorId: string): Promise<Club> {
    const validated = createClubSchema.parse(dto)

    // Transaction: create club and add creator as admin
    const club = await prisma.$transaction(async (tx) => {
      const newClub = await tx.club.create({
        data: {
          name: validated.name,
          description: validated.description ?? null,
          logoUrl: validated.logoUrl ?? null,
          createdBy: creatorId,
        },
      })

      // Automatically add creator as admin member
      await tx.clubMember.create({
        data: {
          clubId: newClub.id,
          userId: creatorId,
          role: 'admin',
        },
      })

      return newClub
    })

    return club
  }

  /**
   * Find club by ID
   */
  async findById(id: string): Promise<Club> {
    const club = await prisma.club.findUnique({
      where: { id },
    })

    if (!club) {
      throw new NotFoundError('Club not found')
    }

    return club
  }

  /**
   * Update club details (admin only)
   */
  async update(id: string, dto: UpdateClubDto, actorId: string): Promise<Club> {
    const validated = updateClubSchema.parse(dto)

    // Verify actor is admin
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId: actorId,
        },
      },
    })

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can update club details')
    }

    const club = await prisma.club.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.logoUrl !== undefined && { logoUrl: validated.logoUrl }),
      },
    })

    return club
  }

  /**
   * List all members of a club
   */
  async listMembers(clubId: string): Promise<ClubMember[]> {
    const members = await prisma.clubMember.findMany({
      where: { clubId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })

    return members
  }

  /**
   * Add a member to a club (admin only)
   */
  async addMember(
    clubId: string,
    dto: AddMemberDto,
    actorId: string
  ): Promise<ClubMember> {
    const validated = addMemberSchema.parse(dto)

    // Verify actor is admin
    const actorMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: actorId,
        },
      },
    })

    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can add members')
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Check if user is already a member
    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: validated.userId,
        },
      },
    })

    if (existingMembership) {
      throw new BadRequestError('User is already a member of this club')
    }

    const member = await prisma.clubMember.create({
      data: {
        clubId,
        userId: validated.userId,
        role: validated.role,
      },
    })

    return member
  }

  /**
   * Update member role (admin only)
   */
  async updateMemberRole(
    clubId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    actorId: string
  ): Promise<ClubMember> {
    const validated = updateMemberRoleSchema.parse(dto)

    // Verify actor is admin
    const actorMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: actorId,
        },
      },
    })

    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can update member roles')
    }

    // Prevent self-demotion from admin if they are the last admin
    if (actorId === userId && validated.role !== 'admin') {
      const adminCount = await prisma.clubMember.count({
        where: {
          clubId,
          role: 'admin',
        },
      })

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot remove the last admin from the club')
      }
    }

    // Upsert membership (update if exists, create if not)
    const member = await prisma.clubMember.upsert({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      update: {
        role: validated.role,
      },
      create: {
        clubId,
        userId,
        role: validated.role,
      },
    })

    return member
  }

  /**
   * Remove a member from a club (admin only)
   */
  async removeMember(clubId: string, userId: string, actorId: string): Promise<void> {
    // Verify actor is admin
    const actorMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: actorId,
        },
      },
    })

    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can remove members')
    }

    // Prevent removing self if last admin
    if (actorId === userId) {
      const adminCount = await prisma.clubMember.count({
        where: {
          clubId,
          role: 'admin',
        },
      })

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot remove the last admin from the club')
      }
    }

    const member = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    })

    if (!member) {
      throw new NotFoundError('Member not found')
    }

    await prisma.clubMember.delete({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    })
  }
}

export const clubService = new ClubService()
