import path from 'path';
import { uploadToR2, generateUniqueFilename } from './r2Storage.js';
/**
 * Process image: optimize and upload
 *
 * @param imageBuffer - Image file content as Buffer
 * @param originalFilename - Original filename (used for generating unique name)
 * @returns Public URL of the uploaded image
 *
 * @throws Error if upload fails
 */
export async function processImage(
  imageBuffer: Buffer,
  originalFilename: string
): Promise<string> {
  const filename = generateUniqueFilename(originalFilename, 'images/');
  return await uploadToR2(imageBuffer, filename, 'image/jpeg', '');
}
