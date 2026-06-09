import { Router, type Request, type Response } from 'express'
import * as authService from '../services/auth.service.js'
import { AuthenticationError, ConflictError, ValidationError } from '../lib/errors.js'

const REFRESH_COOKIE_NAME = 'refreshToken'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
}

export const authRouter = Router()

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.register(req.body)
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS)
    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message })
    } else if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body)
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS)
    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({ error: 'Invalid credentials' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' })
      return
    }
    const result = await authService.refresh(refreshToken)
    res.status(200).json({ accessToken: result.accessToken, user: result.user })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
      res.status(401).json({ error: 'Invalid or expired refresh token' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined
    if (refreshToken) {
      await authService.logout(refreshToken)
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    res.status(200).json({ message: 'Logged out successfully' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
