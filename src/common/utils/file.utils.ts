const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function getExtensionFromMimeType(mimeType: string): string | null {
  return MIME_EXTENSIONS[mimeType.toLowerCase()] ?? null;
}
