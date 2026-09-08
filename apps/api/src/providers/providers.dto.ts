import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
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
import { DocumentType, EducationLevel, Gender, IdType } from '@prisma/client';

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

  // ── Registration form section 1: personal details ──────────────────────
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(IdType)
  idType?: IdType;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  idNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  residentialSubCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  residentialWoreda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  houseNumber?: string;

  // ── section 2: professional and technical skills ───────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  certifications?: string;

  // ── section 3: preferred service area ──────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  woreda?: string;

  // ── section 4: guarantor / emergency contact ───────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guarantorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  guarantorRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guarantorPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  guarantorSubCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  guarantorWoreda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  guarantorHouseNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  guarantorIdNumber?: string;

  /**
   * Typed name accepting the declaration on the form - information accurate,
   * consent to a background check, and full liability for the work done. The
   * server stamps the date; the client cannot backdate it.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declarationName?: string;
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
