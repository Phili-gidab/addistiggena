import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Language } from '@prisma/client';
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
