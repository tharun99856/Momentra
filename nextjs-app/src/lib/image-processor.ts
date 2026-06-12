import sharp from 'sharp'

export type ClubRole = 'admin' | 'photographer' | 'member'

export interface ImageVariants {
  compressed: Buffer
  thumbSm: Buffer
  thumbMd: Buffer
  width: number
  height: number
}

/**
 * Generate three image variants in parallel: compressed, small thumbnail, and medium thumbnail.
 */
export async function processImageVariants(buffer: Buffer): Promise<ImageVariants> {
  const metadata = await sharp(buffer).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  const [compressed, thumbSm, thumbMd] = await Promise.all([
    sharp(buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
    sharp(buffer).resize({ width: 300 }).jpeg({ quality: 80 }).toBuffer(),
    sharp(buffer).resize({ width: 600 }).jpeg({ quality: 80 }).toBuffer(),
  ])

  return { compressed, thumbSm, thumbMd, width, height }
}

/**
 * Apply text watermark to an image based on user role.
 *
 * - viewer | member | admin: `{clubName} · {eventName}`
 * - photographer: `© {photographerName} · {clubName}`
 */
export async function applyWatermark(
  inputBuffer: Buffer,
  role: ClubRole | 'viewer',
  clubName: string,
  eventName: string,
  photographerName?: string
): Promise<Buffer> {
  if (!clubName || clubName.trim().length === 0) {
    throw new Error('clubName must be a non-empty string')
  }
  if (!eventName || eventName.trim().length === 0) {
    throw new Error('eventName must be a non-empty string')
  }
  if (role === 'photographer' && (!photographerName || photographerName.trim().length === 0)) {
    throw new Error('photographerName is required when role is "photographer"')
  }

  let watermarkText: string
  if (role === 'photographer' && photographerName) {
    watermarkText = `© ${photographerName} · ${clubName}`
  } else {
    watermarkText = `${clubName} · ${eventName}`
  }

  const image = sharp(inputBuffer)
  const metadata = await image.metadata()
  const imageWidth = metadata.width ?? 0
  const imageHeight = metadata.height ?? 0

  const fontSize = Math.max(16, Math.floor(imageWidth / 50))
  const margin = 20

  const svgWatermark = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <style>
        .watermark {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          font-weight: 600;
          fill: white;
          opacity: 0.8;
        }
      </style>
      <text
        x="${imageWidth - margin}"
        y="${imageHeight - margin}"
        text-anchor="end"
        class="watermark"
      >${escapeXml(watermarkText)}</text>
    </svg>
  `

  return sharp(inputBuffer)
    .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
