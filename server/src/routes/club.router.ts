// Club API routes

import { Router, type Request, type Response } from 'express'
import { clubService } from '../services/club.service.js'
import { requireAuth, requireGlobalAdmin } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/express.js'

const router = Router()

/**
 * POST /api/clubs
 * Create a new club (global admin only)
 */
router.post(
  '/',
  requireAuth,
  requireGlobalAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const club = await clubService.create(req.body, authedReq.user.sub)
      res.status(201).json(club)
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * GET /api/clubs/:id
 * Get club details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = req.params.id
    if (typeof clubId !== 'string') {
      res.status(400).json({ error: 'Invalid club ID' })
      return
    }
    const club = await clubService.findById(clubId)
    res.status(200).json(club)
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('not found') ? 404 : 400
      res.status(statusCode).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

/**
 * PATCH /api/clubs/:id
 * Update club details (admin only)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authedReq = req as AuthenticatedRequest
    const clubId = req.params.id
    if (typeof clubId !== 'string') {
      res.status(400).json({ error: 'Invalid club ID' })
      return
    }
    const club = await clubService.update(clubId, req.body, authedReq.user.sub)
    res.status(200).json(club)
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('Forbidden') ? 403 : 400
      res.status(statusCode).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

/**
 * GET /api/clubs/:id/members
 * List all club members
 */
router.get(
  '/:id/members',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clubId = req.params.id
      if (typeof clubId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID' })
        return
      }
      const members = await clubService.listMembers(clubId)
      res.status(200).json(members)
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * POST /api/clubs/:id/members
 * Add a member to the club (admin only)
 */
router.post(
  '/:id/members',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const clubId = req.params.id
      if (typeof clubId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID' })
        return
      }
      const member = await clubService.addMember(
        clubId,
        req.body,
        authedReq.user.sub
      )
      res.status(201).json(member)
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('Forbidden')
          ? 403
          : error.message.includes('not found')
            ? 404
            : error.message.includes('already a member')
              ? 409
              : 400
        res.status(statusCode).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * PATCH /api/clubs/:id/members/:userId
 * Update member role (admin only)
 */
router.patch(
  '/:id/members/:userId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const clubId = req.params.id
      const userId = req.params.userId
      if (typeof clubId !== 'string' || typeof userId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID or user ID' })
        return
      }
      const member = await clubService.updateMemberRole(
        clubId,
        userId,
        req.body,
        authedReq.user.sub
      )
      res.status(200).json(member)
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('Forbidden')
          ? 403
          : error.message.includes('last admin')
            ? 400
            : 400
        res.status(statusCode).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * DELETE /api/clubs/:id/members/:userId
 * Remove a member from the club (admin only)
 */
router.delete(
  '/:id/members/:userId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const clubId = req.params.id
      const userId = req.params.userId
      if (typeof clubId !== 'string' || typeof userId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID or user ID' })
        return
      }
      await clubService.removeMember(
        clubId,
        userId,
        authedReq.user.sub
      )
      res.status(204).send()
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('Forbidden')
          ? 403
          : error.message.includes('not found')
            ? 404
            : error.message.includes('last admin')
              ? 400
              : 400
        res.status(statusCode).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

export default router
