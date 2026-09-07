import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Language } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

/**
 * Username + password a customer or technician chooses after verifying their
 * phone, so later sign-ins do not need an SMS code (client decision
 * 2026-09-07). The phone stays the account's identity and OTP always works.
 */
class SetCredentialsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9._-]+$/i, {
    message: 'username: letters, digits, dot, dash and underscore only',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}

/** Expo push token registered by the mobile app after permission is granted. */
class PushTokenDto {
  @IsString()
  @MaxLength(255)
  token: string;
}

/** Credential secrets must never leave the API - strip before returning a user row. */
function sanitize<T extends { passwordHash?: string | null }>(row: T) {
  const { passwordHash: _ph, ...safe } = row;
  return safe;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      include: { providerProfile: { include: { category: true } } },
    });
    return sanitize(row);
  }

  @Patch('me')
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    const row = await this.prisma.user.update({ where: { id: user.userId }, data: dto });
    return sanitize(row);
  }

  /** Set (or change) the username and password for this account. Phone-OTP
   *  remains available - this is an extra door, not a replacement. */
  @Post('me/credentials')
  @HttpCode(200)
  async setCredentials(@CurrentUser() user: AuthUser, @Body() dto: SetCredentialsDto) {
    const username = dto.username.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { username, NOT: { id: user.userId } },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('That username is taken');
    const row = await this.prisma.user.update({
      where: { id: user.userId },
      data: { username, passwordHash: hashSync(dto.password, 10) },
    });
    return sanitize(row);
  }

  /** Register this device for push. One token per account - the last device to
   *  sign in wins, which matches how technicians actually work. */
  @Post('me/push-token')
  @HttpCode(200)
  async pushToken(@CurrentUser() user: AuthUser, @Body() dto: PushTokenDto) {
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { pushToken: dto.token },
    });
    return { ok: true };
  }
}
