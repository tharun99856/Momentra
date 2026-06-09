import sharp from 'sharp';

export type ClubRole = 'admin' | 'photographer' | 'member';

export interface ImageVariants {
  compressed: Buffer;
  thumbSm: Buffer;
  thumbMd: Buffer;
  width: number;
  height: number;
}

/**
 * Generate three image variants in parallel: compressed, small thumbnail, and medium thumbnail.
 *
 * @param buffer - Input image buffer (JPEG, PNG, WebP, HEIC)
 * @returns Image variants with metadata
 * @throws Error if Sharp cannot decode the buffer
 */
export async function processImageVariants(
  buffer: Buffer
): Promise<ImageVariants> {
  // Get metadata first to extract dimensions
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  // Generate all three variants in parallel
  const [compressed, thumbSm, thumbMd] = await Promise.all([
    sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
    sharp(buffer).resize({ width: 300 }).jpeg({ quality: 80 }).toBuffer(),
    sharp(buffer).resize({ width: 600 }).jpeg({ quality: 80 }).toBuffer(),
  ]);

  return {
    compressed,
    thumbSm,
    thumbMd,
    width,
    height,
  };
}

/**
 * Apply text watermark to an image based on user role.
 *
 * Watermark rules:
 * - viewer | member | admin: `{clubName} · {eventName}`
 * - photographer: `© {photographerName} · {clubName}`
 *
 * @param inputBuffer - Input image buffer (must be valid JPEG or PNG)
 * @param role - User role determining watermark format
 * @param clubName - Club name (required, non-empty)
 * @param eventName - Event name (required, non-empty)
 * @param photographerName - Photographer name (required when role is 'photographer')
 * @returns Watermarked JPEG buffer
 * @throws Error if role is 'photographer' and photographerName is empty or undefined
 * @throws Error if clubName or eventName is empty
 */
export async function applyWatermark(
  inputBuffer: Buffer,
  role: ClubRole | 'viewer',
  clubName: string,
  eventName: string,
  photographerName?: string
): Promise<Buffer> {
  // Validation
  if (!clubName || clubName.trim().length === 0) {
    throw new Error('clubName must be a non-empty string');
  }
  if (!eventName || eventName.trim().length === 0) {
    throw new Error('eventName must be a non-empty string');
  }
  if (role === 'photographer') {
    if (!photographerName || photographerName.trim().length === 0) {
      throw new Error(
        'photographerName is required when role is "photographer"'
      );
    }
  }

  // Determine watermark text based on role
  let watermarkText: string;
  if (role === 'photographer' && photographerName) {
    watermarkText = `© ${photographerName} · ${clubName}`;
  } else {
    watermarkText = `${clubName} · ${eventName}`;
  }

  // Get image dimensions to calculate watermark position
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;

  // Calculate font size based on image width (responsive watermark)
  // For a 1200px image, use 24px font; scale proportionally
  const fontSize = Math.max(16, Math.floor(imageWidth / 50));
  const margin = 20;

  // Create SVG text overlay
  // Position: bottom-right with 20px margin
  const svgWatermark = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <style>
        .watermark {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          font-weight: 600;
          fill: white;
          opacity: 0.8;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
      </style>
      <text
        x="${imageWidth - margin}"
        y="${imageHeight - margin}"
        text-anchor="end"
        class="watermark"
      >${escapeXml(watermarkText)}</text>
    </svg>
  `;

  // Apply watermark using Sharp composite
  // Clone input by creating a new Sharp instance to avoid mutation
  const watermarked = await sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return watermarked;
}

/**
 * Escape XML special characters to prevent SVG injection
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
