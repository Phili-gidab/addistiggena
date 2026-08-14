import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import {
  CancelBookingDto,
  CompleteBookingDto,
  CreateBookingDto,
  SendMessageDto,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.bookings.mine(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.getForParty(id, user);
  }

  @Get(':id/track')
  track(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.track(id, user);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.messages(id, user);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.bookings.sendMessage(id, user, dto);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.transition(id, 'accept', user);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.transition(id, 'reject', user);
  }

  @Post(':id/enroute')
  enroute(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.transition(id, 'enroute', user);
  }

  @Post(':id/arrive')
  arrive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.transition(id, 'arrive', user);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.transition(id, 'start', user);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteBookingDto,
  ) {
    return this.bookings.transition(id, 'complete', user, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CancelBookingDto) {
    return this.bookings.cancel(id, user, dto);
  }
}
