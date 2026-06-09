import { Router, type Request, type Response, type NextFunction } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { getMediaUrl, uploadFile } from '../lib/storage.js'
import { avatarKey } from '../lib/paths.js'

const router = Router()

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        username: true,
        email: true,
        globalRole: true,
        avatarUrl: true,
        faceDescriptor: true,
        createdAt: true,
        _count: { select: { clubMemberships: true, uploadedMedia: true } },
      },
    })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      globalRole: user.globalRole,
      avatarUrl: user.avatarUrl,
      hasFaceDescriptor: user.faceDescriptor.length > 0,
      clubCount: user._count.clubMemberships,
      uploadCount: user._count.uploadedMedia,
      createdAt: user.createdAt,
    })
  } catch (error) { next(error) }
})

router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email } = req.body
    const data: Record<string, string> = {}
    if (username) data.username = username
    if (email) data.email = email

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data,
      select: { id: true, username: true, email: true, globalRole: true, avatarUrl: true },
    })
    res.json(user)
  } catch (error) { next(error) }
})

const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

router.post('/me/avatar', requireAuth, avatarUpload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file
    if (!file) { res.status(400).json({ error: 'No file provided' }); return }

    const key = avatarKey(req.user!.sub)
    await uploadFile(key, file.buffer, file.mimetype)

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatarUrl: key },
      select: { id: true, username: true, email: true, avatarUrl: true },
    })

    res.json({ ...user, avatarUrl: getMediaUrl(user.avatarUrl) })
  } catch (error) { next(error) }
})

router.post('/me/face', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // For v1, store a dummy descriptor to mark opt-in
    const descriptor = Array.from({ length: 128 }, () => Math.random())
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { faceDescriptor: descriptor },
    })
    res.json({ success: true })
  } catch (error) { next(error) }
})

router.delete('/me/face', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { faceDescriptor: [] },
    })
    res.json({ success: true })
  } catch (error) { next(error) }
})

router.get('/me/photos', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.sub
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 24))

    // Photos uploaded by the user OR where user is tagged
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where: {
          OR: [
            { uploaderId: userId },
            { photoTags: { some: { userId } } },
          ],
        },
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          event: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.media.count({
        where: {
          OR: [
            { uploaderId: userId },
            { photoTags: { some: { userId } } },
          ],
        },
      }),
    ])

    const eventIds = new Set(media.map((m) => m.eventId))

    const items = media.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      eventName: m.event.name,
      uploaderId: m.uploaderId,
      mediaType: m.mediaType,
      signedUrl: getMediaUrl(m.compressedUrl),
      thumbSmUrl: getMediaUrl(m.thumbSmUrl),
      thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      likesCount: m._count.likes,
      commentsCount: m._count.comments,
      tags: m.tags,
      uploadedAt: m.uploadedAt.toISOString(),
    }))

    res.json({ items, total, eventCount: eventIds.size, page, pageSize })
  } catch (error) { next(error) }
})

router.get('/me/notifications', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.sub
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 20))

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
    ])

    const items = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      actor: n.actor,
      mediaId: n.mediaId,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }))

    res.json({ items, total, unreadCount, page, pageSize })
  } catch (error) { next(error) }
})

router.put('/me/notifications/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ success: true })
  } catch (error) { next(error) }
})

export default router
