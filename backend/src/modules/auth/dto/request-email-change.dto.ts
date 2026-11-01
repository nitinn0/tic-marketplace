import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
