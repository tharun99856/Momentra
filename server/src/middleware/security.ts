import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many search requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

const activeUploads = new Map<string, number>()

export function uploadConcurrencyLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.sub
  if (!userId) {
    res.status(401).json({ error: 'Unauthenticated' })
    return
  }

  const current = activeUploads.get(userId) || 0
  if (current >= 3) {
    res.status(429).json({ error: 'Too many concurrent uploads. Please wait for current uploads to complete.' })
    return
  }

  activeUploads.set(userId, current + 1)
  res.on('finish', () => {
    const count = activeUploads.get(userId) || 1
    if (count <= 1) activeUploads.delete(userId)
    else activeUploads.set(userId, count - 1)
  })

  next()
}

export const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://*.cloudfront.net', 'https://images.unsplash.com'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    },
  },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' as const },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}
