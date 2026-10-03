import { Type } from 'class-transformer';
import {
  IsLatitude,
  Matches,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  /** Optional: customer picked a specific technician from the nearby list. */
  @IsOptional()
  @IsString()
  providerId?: string;

  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  landmarkNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** objectKey returned by POST /uploads - the optional problem photo. */
  @IsOptional()
  @IsString()
  @Matches(/^\d+-[0-9a-f]+\.[a-z0-9]+$/i, { message: 'photoObjectKey: not an uploaded object key' })
  photoObjectKey?: string;
}

export class CompleteBookingDto {
  /**
   * What the customer is actually charged, and the only number the commission
   * is taken from. It used to be optional and allowed to be zero, so a job
   * could be closed with no price at all and earn Amnen nothing (client
   * decision, Oct 2026: "make it impossible to proceed unless the technician
   * writes the correct amount"). The floor for the trade is checked server
   * side as well - see BookingsService.transition.
   */
  @IsNumber()
  @Min(1, { message: 'finalPriceEtb: enter the amount the customer is paying' })
  @Max(1_000_000)
  finalPriceEtb: number;
}

export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;
}
