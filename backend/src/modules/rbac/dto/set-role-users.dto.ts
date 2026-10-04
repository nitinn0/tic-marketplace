import { IsArray, IsString } from 'class-validator';

export class SetRoleUsersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
