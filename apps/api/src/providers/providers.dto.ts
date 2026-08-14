import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UpsertProfileDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  serviceRadiusKm?: number;

  // Vetting protocol fields (official onboarding document)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  woreda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  faydaIdNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guarantorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guarantorPhone?: string;
}

export class AvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;
}

export class LocationDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;
}

export class NearbyQueryDto extends LocationDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}

export class RegisterDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  objectKey: string;
}
