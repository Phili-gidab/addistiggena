import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import {
  AvailabilityDto,
  LocationDto,
  NearbyQueryDto,
  RegisterDocumentDto,
  UpsertProfileDto,
} from './providers.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  /** Identity-free: how many technicians of this trade cover this point.
   *  Customers must not learn WHO before that technician accepts (client rule). */
  @Get('availability')
  categoryAvailability(@Query() query: NearbyQueryDto) {
    return this.providers.availability(query.lat, query.lng, query.categoryId);
  }

  /** Deprecated alias kept so already-installed app builds degrade gracefully
   *  instead of erroring - returns the same identity-free payload. */
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    return this.providers.availability(query.lat, query.lng, query.categoryId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.providers.getProfileByUser(user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertProfileDto) {
    return this.providers.upsertProfile(user.userId, dto);
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard)
  availability(@CurrentUser() user: AuthUser, @Body() dto: AvailabilityDto) {
    return this.providers.setAvailability(user.userId, dto.isAvailable);
  }

  @Put('me/location')
  @UseGuards(JwtAuthGuard)
  location(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.providers.setLocation(user.userId, dto.lat, dto.lng);
  }

  @Post('me/documents')
  @UseGuards(JwtAuthGuard)
  registerDocument(@CurrentUser() user: AuthUser, @Body() dto: RegisterDocumentDto) {
    return this.providers.registerDocument(user.userId, dto);
  }
}
