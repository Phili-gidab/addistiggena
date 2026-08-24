import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TicketStatus, TicketType } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { TicketsService } from './tickets.service';

class OpenTicketDto {
  @IsString()
  bookingId: string;

  @IsEnum(TicketType)
  type: TicketType;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  note: string;
}

class TicketQueueQuery {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}

class CloseTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  resolutionNote: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundEtb?: number;
}

class ReinspectDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  // ── customer / technician ─────────────────────────────────────────────────

  @Post('tickets')
  @HttpCode(200)
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenTicketDto) {
    return this.tickets.open(user, dto.bookingId, dto.type, dto.note);
  }

  @Get('tickets/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.tickets.mine(user);
  }

  // ── staff (Support Agent queue; Ops and Super Admin can also act) ─────────

  @Get('admin/tickets')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  queue(@Query() query: TicketQueueQuery) {
    return this.tickets.queue(query.status);
  }

  @Post('admin/tickets/:id/reinspect')
  @HttpCode(200)
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  reinspect(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReinspectDto) {
    return this.tickets.reinspect(user, id, dto.note);
  }

  @Post('admin/tickets/:id/resolve')
  @HttpCode(200)
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseTicketDto) {
    return this.tickets.close(user, id, 'RESOLVED', dto.resolutionNote, dto.refundEtb);
  }

  @Post('admin/tickets/:id/reject')
  @HttpCode(200)
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseTicketDto) {
    return this.tickets.close(user, id, 'REJECTED', dto.resolutionNote);
  }
}
