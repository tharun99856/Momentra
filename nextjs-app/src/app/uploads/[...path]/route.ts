/**
 * Serve locally-uploaded files in development.
 * In production with Cloudinary this route is never hit because URLs are CDN links.
 *
 * GET /uploads/<any/nested/path>
 */
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  const relativePath = params.path.join('/')
  const filePath = path.join(UPLOADS_DIR, relativePath)

  // Security: prevent path traversal
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME[ext] ?? 'application/octet-stream'

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
