import { existsSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_DIR } from './uploads.controller';

/** Uploaded object keys are always `<timestamp>-<hex><ext>` - anything else is rejected. */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Content types are set explicitly from the stored (MIME-derived) extension so the
 *  response can never be sniffed or served as an active type like text/html. */
const TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

/**
 * Authenticated file serving. Uploads hold national IDs and police clearances, so
 * they are never exposed as public static assets: admins can read everything,
 * a provider can read their own registered documents, everyone else is refused.
 */
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':objectKey')
  async serve(
    @Param('objectKey') objectKey: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (!SAFE_KEY.test(objectKey) || objectKey.includes('..')) {
      throw new BadRequestException('Invalid object key');
    }

    // Back-office roles read everything (verification documents, problem photos);
    // a provider reads their own documents; booking parties read the problem photo
    // attached to their booking (customer, assigned technician, or an offered one).
    const staff = ['ADMIN', 'OPS_MANAGER', 'VERIFICATION_OFFICER', 'SUPPORT_AGENT'];
    if (!staff.includes(user.role)) {
      const [doc, bookingPhoto] = await Promise.all([
        this.prisma.providerDocument.findFirst({
          where: { objectKey, provider: { userId: user.userId } },
          select: { id: true },
        }),
        this.prisma.booking.findFirst({
          where: {
            photoObjectKey: objectKey,
            OR: [
              { customerId: user.userId },
              { provider: { userId: user.userId } },
              { offers: { some: { provider: { userId: user.userId } } } },
            ],
          },
          select: { id: true },
        }),
      ]);
      if (!doc && !bookingPhoto) throw new ForbiddenException('Not your document');
    }

    const path = join(UPLOAD_DIR, objectKey);
    if (!existsSync(path)) throw new NotFoundException('File not found');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const type = TYPE_BY_EXT[extname(objectKey).toLowerCase()];
    if (type) {
      res.setHeader('Content-Type', type);
    } else {
      // unknown extension (legacy upload): force download, never render
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${objectKey}"`);
    }
    res.sendFile(path);
  }
}
