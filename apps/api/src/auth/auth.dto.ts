import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

// Ethiopian mobile numbers: +2519xxxxxxxx / +2517xxxxxxxx / 09xxxxxxxx / 07xxxxxxxx
export const ET_PHONE_REGEX = /^(\+251[79]\d{8}|0[79]\d{8})$/;

export class RequestOtpDto {
  @IsString()
  @Matches(ET_PHONE_REGEX, { message: 'phone must be a valid Ethiopian mobile number' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(ET_PHONE_REGEX, { message: 'phone must be a valid Ethiopian mobile number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class PasswordLoginDto {
  /** username, or an Ethiopian phone number for accounts that set a password */
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  username: string;

  @IsString()
  @Length(6, 100)
  password: string;
}

export class TelegramLinkDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @Matches(ET_PHONE_REGEX, { message: 'phone must be a valid Ethiopian mobile number' })
  phone: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}

export class TelegramResumeDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;
}

/** Normalize to +251 international form. */
export function normalizePhone(phone: string): string {
  return phone.startsWith('0') ? `+251${phone.slice(1)}` : phone;
}
