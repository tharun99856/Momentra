import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { ClubRole } from '@prisma/client'
import { verifyAccessToken } from '../services/auth.service.js'
import { AuthenticationError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'

/**
 * Middleware: requireAuth
 * 
 * Extracts Bearer token from Authorization header, verifies RS256 signature,
 * and attaches req.user: JwtPayload. Returns 401 if missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }

    const token = authHeader.slice(7) // Remove 'Bearer ' prefix
    
    // verifyAccessToken throws AuthenticationError if invalid/expired
    const payload = verifyAccessToken(token)
    req.user = payload
    
    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }
    next(error)
  }
}

/**
 * Middleware: resolveClubContext
 * 
 * Extracts eventId from req.params or req.body, looks up event → club,
 * queries club_members for req.user.sub, and attaches req.clubId and req.clubRole.
 * Sets clubRole to null if not a member. Skips gracefully if no eventId present.
 */
export async function resolveClubContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const eventId = req.params['eventId'] ?? req.body?.eventId

    // Skip if no eventId present
    if (!eventId) {
      next()
      return
    }

    // Type guard: Prisma expects string, but params can be string | string[]
    // In practice Express routes give us string, but we validate to satisfy TypeScript
    if (typeof eventId !== 'string') {
      res.status(400).json({ error: 'Invalid eventId' })
      return
    }

    // Look up event → club
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { clubId: true },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    req.clubId = event.clubId

    // If no authenticated user, set clubRole to null and proceed
    if (!req.user) {
      req.clubRole = null
      next()
      return
    }

    // Query club_members for the user's role
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: req.user.sub,
        },
      },
      select: { role: true },
    })

    req.clubRole = membership?.role ?? null
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware factory: requireClubRole
 * 
 * Checks req.user (401 if absent) and req.clubRole rank against minRole
 * using { member:1, photographer:2, admin:3 }. Returns 403 for both missing
 * membership and insufficient rank — same error body, never leaking which check failed.
 */
export function requireClubRole(minRole: ClubRole): RequestHandler {
  const ROLE_RANK: Record<ClubRole, number> = {
    member: 1,
    photographer: 2,
    admin: 3,
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }

    // Missing membership or insufficient rank both return 403 with same error
    if (!req.clubRole || ROLE_RANK[req.clubRole] < ROLE_RANK[minRole]) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    next()
  }
}

/**
 * Middleware: requireGlobalAdmin
 * 
 * Checks req.user.globalRole === 'admin'. Returns 403 for 'user' global role
 * regardless of club role.
 */
export function requireGlobalAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' })
    return
  }

  if (req.user.globalRole !== 'admin') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}
