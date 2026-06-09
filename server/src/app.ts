import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { join } from 'path'
import { corsOptions, helmetConfig } from './middleware/security.js'
import { verifyAccessToken } from './services/auth.service.js'
import { authRouter } from './routes/auth.router.js'
import clubRouter from './routes/club.router.js'
import eventRouter from './routes/event.router.js'
import mediaRouter from './routes/media.router.js'
import socialRouter from './routes/social.router.js'
import searchRouter from './routes/search.router.js'
import userRouter from './routes/user.router.js'

export const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(helmet(helmetConfig))
app.use(cors(corsOptions))

app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

app.use((req, _res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7))
    } catch {
      // token invalid or expired — leave req.user undefined
    }
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/clubs', clubRouter)
app.use('/api/clubs', eventRouter)
app.use('/api/events', eventRouter)
app.use('/api/users', userRouter)
app.use('/api', mediaRouter)
app.use('/api', socialRouter)
app.use('/api', searchRouter)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err)
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' })
})

export default app
