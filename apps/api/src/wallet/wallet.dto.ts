import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class RequestPayoutDto {
  @IsNumber()
  @Min(100, { message: 'Minimum payout is 100 ETB' })
  amountEtb: number;

  /** Telebirr number or bank account the provider wants the money sent to. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  destination: string;
}
