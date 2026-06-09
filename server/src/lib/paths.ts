/**
 * Canonical S3 path helpers.
 * These must match the paths specified in design.md exactly.
 * DO NOT change these without updating the corresponding DB records and CloudFront behaviors.
 */

export function originalKey(eventId: string, uuid: string, ext: string): string {
  // ext should start with a dot, e.g. ".jpg"
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`
  return `events/${eventId}/originals/${uuid}${normalizedExt}`
}

export function compressedKey(uuid: string): string {
  return `compressed/${uuid}.jpg`
}

export function thumbSmKey(uuid: string): string {
  return `thumbs/sm/${uuid}.jpg`
}

export function thumbMdKey(uuid: string): string {
  return `thumbs/md/${uuid}.jpg`
}

export function avatarKey(userId: string): string {
  return `avatars/${userId}.jpg`
}
