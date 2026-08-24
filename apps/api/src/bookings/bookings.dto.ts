import { Type } from 'class-transformer';
import {
  IsLatitude,
  Matches,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPriceEtb?: number;
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
