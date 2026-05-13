/** Resize and compress to JPEG data URL for localStorage; returns null if still too large. */
export async function compressImageToJpegDataUrl(
  file: File,
  maxWidth = 720,
  maxDataUrlChars = 380_000
): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  let w = bmp.width;
  let h = bmp.height;
  if (w > maxWidth) {
    h = Math.round((h * maxWidth) / w);
    w = maxWidth;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  let quality = 0.82;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > maxDataUrlChars && quality > 0.38) {
    quality -= 0.06;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > maxDataUrlChars) return null;
  return data;
}
