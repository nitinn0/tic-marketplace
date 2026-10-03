import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSubModuleDto {
  @IsString()
  moduleId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
