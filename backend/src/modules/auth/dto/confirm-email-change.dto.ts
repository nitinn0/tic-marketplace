import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;
}
