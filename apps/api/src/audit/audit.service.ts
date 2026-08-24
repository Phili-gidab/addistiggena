import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Spec section 8: every manual staff override is logged with a reason code and
 * feeds the record Verification Officer references on re-review. Fire-and-forget -
 * an audit write must never fail the action it describes.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(
    actor: AuthUser,
    action: string,
    targetType: string,
    targetId: string,
    reason?: string,
    meta?: Prisma.InputJsonValue,
  ) {
    void this.prisma.auditLog
      .create({
        data: {
          actorId: actor.userId,
          actorRole: actor.role as Role,
          action,
          targetType,
          targetId,
          reason: reason?.slice(0, 500),
          meta,
        },
      })
      .catch((e) => this.logger.error(`audit write failed for ${action}: ${e.message}`));
  }
}
