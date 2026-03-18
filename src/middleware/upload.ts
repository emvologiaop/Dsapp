import multer from 'multer';

const imageTypes = /image\/(jpeg|jpg|png|webp|gif)/i;

const memoryStorage = multer.memoryStorage();

function fileFilterFor(pattern: RegExp) {
  return (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    cb(null, pattern.test(file.mimetype));
  };
}

export const uploadImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilterFor(imageTypes),
});

export const uploadMultipleImages = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: fileFilterFor(imageTypes),
});
