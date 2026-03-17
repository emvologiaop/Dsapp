export type UploadProgress = {
  percentage: number;
};

export async function compressImage(file: File, maxW: number, maxH: number, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', quality)
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
}

export async function uploadMultipleImagesToR2(files: File[], onProgress?: (p: UploadProgress) => void): Promise<string[]> {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));

  // NOTE: fetch doesn't expose upload progress; we simulate progress for UX.
  onProgress?.({ percentage: 10 });
  const res = await fetch('/api/images/upload-multiple-r2', { method: 'POST', body: form });
  onProgress?.({ percentage: 70 });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Image upload failed');
  }

  const data = await res.json();
  const urls = Array.isArray(data?.urls) ? data.urls : [];
  onProgress?.({ percentage: 100 });
  return urls;
}

