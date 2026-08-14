import { randomBytes } from 'crypto';
import { join, resolve } from 'path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards';

// resolve(): express res.sendFile requires an absolute path — a relative UPLOAD_DIR
// would accept uploads but 500 on every read.
export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'));

/**
 * The stored extension is derived from the validated MIME type — NEVER from the
 * client-supplied filename. A client declaring image/png but uploading "id.html"
 * must not produce an .html object that later gets served as text/html (stored XSS).
 */
export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const ALLOWED = Object.keys(EXT_BY_MIME);

/**
 * Local-disk storage driver for development. In production this module is swapped
 * for Telecloud OBS pre-signed URLs (docs/03) — the client contract stays the same:
 * upload a file, get back an objectKey to attach to a document record.
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(
            null,
            `${Date.now()}-${randomBytes(6).toString('hex')}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`,
          ),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WebP or PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received — send multipart field "file"');
    return { objectKey: file.filename, url: `/files/${file.filename}`, size: file.size };
  }
}
