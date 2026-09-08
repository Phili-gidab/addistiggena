import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { DepositMethod } from '@prisma/client';

/**
 * A technician telling us they have paid money into the company account. It
 * stays PENDING until finance matches the reference against the bank
 * statement - declaring one does not move the balance on its own.
 */
export class DeclareDepositDto {
  @IsNumber()
  @Min(50, { message: 'Minimum deposit is 50 ETB' })
  amountEtb: number;

  @IsEnum(DepositMethod)
  method: DepositMethod;

  /** Bank slip or transaction number finance reconciles against. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reference: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
