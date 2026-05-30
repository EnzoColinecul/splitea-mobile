export async function uploadImageToS3(
  localUri: string,
  uploadUrl: string,
  contentType: string = 'image/jpeg',
): Promise<void> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
  if (!putResponse.ok) {
    throw new Error(`S3 upload failed: ${putResponse.status}`);
  }
}

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
};

export function resolveImageMime(
  asset?: { mimeType?: string | null; uri?: string | null } | null,
  fallback: string = 'image/jpeg',
): string {
  if (asset?.mimeType) return asset.mimeType;
  const uri = asset?.uri || '';
  const path = uri.split('?')[0];
  const ext = path.includes('.') ? path.split('.').pop()?.toLowerCase() : undefined;
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  return fallback;
}

export function extensionForMime(mime: string, fallback: string = 'jpg'): string {
  const entry = Object.entries(EXTENSION_MIME).find(([, value]) => value === mime);
  return entry ? entry[0] : fallback;
}
