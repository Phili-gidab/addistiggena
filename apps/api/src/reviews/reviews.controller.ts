import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Reviews are created PENDING and published by admin after 24-hour moderation (proposal §4.1). */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== user.userId) {
      throw new ForbiddenException('Only the customer can review this booking');
    }
    if (booking.status !== 'COMPLETED' && booking.status !== 'PAID') {
      throw new BadRequestException('You can only review a completed job');
    }
    if (booking.review) throw new BadRequestException('Booking already reviewed');

    return this.prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId: user.userId,
        stars: dto.stars,
        text: dto.text,
      },
    });
  }
}
