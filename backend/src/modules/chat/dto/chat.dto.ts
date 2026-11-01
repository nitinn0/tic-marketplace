import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../../common/dto/transforms.js';

export class SendMessageDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class ListMessagesQueryDto {
  @IsOptional()
  @IsUUID()
  after?: string;

  @IsOptional()
  @IsUUID()
  before?: string;
}
