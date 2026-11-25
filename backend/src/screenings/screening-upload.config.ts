import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { open } from 'fs/promises';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Types autorisés pour chaque champ, et l'extension qu'on donnera au fichier
const ALLOWED: Record<string, Record<string, string>> = {
  poster: { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' },
  attachment: {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  },
};

export const screeningUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/screenings',          // dossier créé tout seul s'il n'existe pas
    filename: (req, file, cb) => {
      // nom aléatoire : on n'utilise jamais le nom envoyé par l'utilisateur
      cb(null, randomUUID() + ALLOWED[file.fieldname][file.mimetype]);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.fieldname]?.[file.mimetype]) {
      return cb(new BadRequestException(`Invalid file type for ${file.fieldname}`), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 11}  // 5 Mo par fichier, 11 fichiers max
};

// Signature (premiers octets) attendue pour chaque type
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  'application/pdf': (b) => b.toString('ascii', 0, 5) === '%PDF-',
};

// Lit les 12 premiers octets du fichier reçu et vérifie qu'ils correspondent à son type
export async function hasValidSignature(file: Express.Multer.File): Promise<boolean> {
  const handle = await open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    return SIGNATURES[file.mimetype]?.(buffer) ?? false;
  } finally {
    await handle.close();   // on referme toujours le fichier, même en cas d'erreur
  }
}
