import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFunctionalityDto {
  @IsString()
  subModuleId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(2)
  action: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
