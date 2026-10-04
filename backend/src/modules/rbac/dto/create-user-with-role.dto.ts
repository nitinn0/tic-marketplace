import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserWithRoleDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
