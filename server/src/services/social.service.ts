// Social service implementation

import { prisma } from '../lib/prisma.js'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'

// ===========================
// DTOs and Validation
// ===========================

const AddCommentSchema = z.object({
  mediaId: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string().min(1).max(500),
  parentId: z.string().uuid().optional(),
})

export type AddCommentDto = z.infer<typeof AddCommentSchema>

export interface Comment {
  id: string
  mediaId: string
  userId: string
  parentId: string | null
  text: string
  createdAt: Date
  updatedAt: Date
}

export class SocialService {
  /**
   * Toggle like on a media item
   * 
   * If user has already liked → remove like
   * If user has not liked → add like
   * 
   * Returns the new like state and current count
   */
  async toggleLike(
    userId: string,
    mediaId: string
  ): Promise<{ liked: boolean; count: number }> {
    // Check if like already exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_mediaId: {
          userId,
          mediaId,
        },
      },
    })

    let liked: boolean

    if (existingLike) {
      // Unlike: delete the existing like
      await prisma.like.delete({
        where: {
          userId_mediaId: {
            userId,
            mediaId,
          },
        },
      })
      liked = false
    } else {
      // Like: create a new like
      await prisma.like.create({
        data: {
          userId,
          mediaId,
        },
      })
      liked = true
    }

    // Count current likes for this media
    const count = await prisma.like.count({
      where: {
        mediaId,
      },
    })

    return { liked, count }
  }

  /**
   * Add a comment to a media item
   * 
   * Validates:
   * - Text length 1-500 chars
   * - Reply depth ≤ 1 (replies to replies not allowed)
   * - HTML is stripped from text
   * 
   * Returns the created comment
   */
  async addComment(dto: AddCommentDto): Promise<Comment> {
    // Validate input
    const validated = AddCommentSchema.parse(dto)

    // Strip HTML from text (security: prevent stored XSS)
    const sanitizedText = sanitizeHtml(validated.text, {
      allowedTags: [],
      allowedAttributes: {},
    })

    // If parentId is provided, verify it exists and has no parent itself (depth check)
    if (validated.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: validated.parentId },
        select: { id: true, parentId: true },
      })

      if (!parent) {
        throw new Error('Parent comment not found')
      }

      // Depth check: parent must be top-level (parentId null)
      if (parent.parentId !== null) {
        throw new Error('Reply to reply not allowed')
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        mediaId: validated.mediaId,
        userId: validated.userId,
        parentId: validated.parentId ?? null,
        text: sanitizedText,
      },
    })

    return comment
  }

  /**
   * Edit a comment
   * 
   * Validates:
   * - Only author can edit
   * - Edit window: within 5 minutes of creation
   * - Text 1-500 chars
   * - HTML stripped
   */
  async editComment(
    commentId: string,
    actorId: string,
    newText: string
  ): Promise<Comment> {
    // Validate text length
    if (newText.length < 1 || newText.length > 500) {
      throw new Error('Comment text must be 1-500 characters')
    }

    // Fetch comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    // Authorization: only author can edit
    if (comment.userId !== actorId) {
      throw new Error('Forbidden')
    }

    // Time window check: 5 minutes
    const now = new Date()
    const fiveMinutesInMs = 5 * 60 * 1000
    const timeSinceCreation = now.getTime() - comment.createdAt.getTime()

    if (timeSinceCreation > fiveMinutesInMs) {
      throw new Error('Edit window has closed')
    }

    // Strip HTML
    const sanitizedText = sanitizeHtml(newText, {
      allowedTags: [],
      allowedAttributes: {},
    })

    // Update comment
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        text: sanitizedText,
        updatedAt: now,
      },
    })

    return updated
  }

  /**
   * Delete a comment
   * 
   * Authorization:
   * - Comment author can always delete
   * - Club admin can delete any comment
   * 
   * Side effect:
   * - Cascade delete replies (handled by Prisma schema)
   */
  async deleteComment(
    commentId: string,
    actorId: string,
    isClubAdmin: boolean
  ): Promise<void> {
    // Fetch comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    // Authorization check
    const isAuthor = comment.userId === actorId

    if (!isAuthor && !isClubAdmin) {
      throw new Error('Forbidden')
    }

    // Delete (cascades to replies via Prisma schema)
    await prisma.comment.delete({
      where: { id: commentId },
    })
  }

  /**
   * Toggle favourite on a media item
   * 
   * If user has already favourited → remove favourite
   * If user has not favourited → add favourite
   * 
   * Returns the new favourite state
   * 
   * Note: No notification is triggered for favourites
   */
  async toggleFavourite(
    userId: string,
    mediaId: string
  ): Promise<{ saved: boolean }> {
    // Check if favourite already exists
    const existingFavourite = await prisma.favourite.findUnique({
      where: {
        userId_mediaId: {
          userId,
          mediaId,
        },
      },
    })

    let saved: boolean

    if (existingFavourite) {
      // Unfavourite: delete the existing favourite
      await prisma.favourite.delete({
        where: {
          userId_mediaId: {
            userId,
            mediaId,
          },
        },
      })
      saved = false
    } else {
      // Favourite: create a new favourite
      await prisma.favourite.create({
        data: {
          userId,
          mediaId,
        },
      })
      saved = true
    }

    return { saved }
  }

  /**
   * Tag a user in a photo
   * 
   * Search for user by username and create a photo tag.
   * Tagged user receives a notification (handled by caller).
   * 
   * @param mediaId - UUID of the media item
   * @param targetUsername - Username of the user to tag
   * @param actorId - UUID of the user creating the tag
   * @returns The created photo tag with user details
   */
  async tagUser(
    mediaId: string,
    targetUsername: string,
    actorId: string
  ): Promise<{ id: string; taggedUser: { id: string; username: string; avatarUrl: string | null } }> {
    // Search for user by username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        username: {
          contains: targetUsername,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        faceDescriptor: false, // NEVER include face descriptor
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if tag already exists
    const existing = await prisma.photoTag.findUnique({
      where: {
        mediaId_userId: {
          mediaId,
          userId: user.id,
        },
      },
    })

    if (existing) {
      throw new Error('User already tagged in this photo')
    }

    // Create tag
    const tag = await prisma.photoTag.create({
      data: {
        mediaId,
        userId: user.id,
        taggedById: actorId,
      },
    })

    return {
      id: tag.id,
      taggedUser: user,
    }
  }

  /**
   * Remove a tag from a photo
   * 
   * Authorization:
   * - Tagged user can remove their own tag
   * - Club admin can remove any tag
   * - Others are forbidden
   * 
   * @param mediaId - UUID of the media item
   * @param targetUserId - UUID of the tagged user
   * @param actorId - UUID of the user removing the tag
   * @param isClubAdmin - Whether the actor is a club admin
   */
  async removeTag(
    mediaId: string,
    targetUserId: string,
    actorId: string,
    isClubAdmin: boolean
  ): Promise<void> {
    // Check if tag exists
    const tag = await prisma.photoTag.findUnique({
      where: {
        mediaId_userId: {
          mediaId,
          userId: targetUserId,
        },
      },
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    // Authorization: tagged user or admin
    const isTaggedUser = targetUserId === actorId

    if (!isTaggedUser && !isClubAdmin) {
      throw new Error('Forbidden')
    }

    // Delete tag
    await prisma.photoTag.delete({
      where: {
        mediaId_userId: {
          mediaId,
          userId: targetUserId,
        },
      },
    })
  }

  /**
   * Get all tags for a media item
   * 
   * Returns public user information for tagged users.
   * faceDescriptor is NEVER included.
   * 
   * @param mediaId - UUID of the media item
   * @returns Array of tagged users
   */
  async getTags(mediaId: string): Promise<Array<{ id: string; username: string; avatarUrl: string | null }>> {
    const tags = await prisma.photoTag.findMany({
      where: { mediaId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return tags.map((tag: any) => tag.user)
  }

}

export const socialService = new SocialService()
