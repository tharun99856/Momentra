import type { JwtPayload } from './auth.types.js'
import type { ClubRole } from '@prisma/client'
import type { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
      clubId?: string
      clubRole?: ClubRole | null
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload
}
