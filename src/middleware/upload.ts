import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Crea le cartelle se non esistono
[UPLOAD_DIR, THUMB_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer: memorizza in memoria (buffer), poi Sharp processa
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato non supportato. Usa JPG, PNG o WebP.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
});

// Middleware: processa l'immagine con Sharp dopo l'upload
export async function processImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) { next(); return; }

  try {
    const filename = `cover_${Date.now()}.jpg`;
    const thumbname = `thumb_${Date.now()}.jpg`;

    const fullPath = path.join(UPLOAD_DIR, filename);
    const thumbPath = path.join(THUMB_DIR, thumbname);

    // Immagine originale ridimensionata (max 800x1100)
    await sharp(req.file.buffer)
      .resize(800, 1100, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(fullPath);

    // Miniatura per anteprime
    const thumbW = Number(process.env.THUMBNAIL_WIDTH) || 200;
    const thumbH = Number(process.env.THUMBNAIL_HEIGHT) || 280;
    await sharp(req.file.buffer)
      .resize(thumbW, thumbH, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toFile(thumbPath);

    // Aggiunge i percorsi alla request per il controller
    (req as any).coverPath = filename;
    (req as any).thumbPath = thumbname;

    next();
  } catch (err) {
    next(err);
  }
}
