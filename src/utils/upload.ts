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
