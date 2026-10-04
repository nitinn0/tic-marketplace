import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { ToBoolean, TrimLower, TrimUpper } from './transforms.js';

export class InviteMemberDto {
  @TrimLower()
  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;
}

export class UpdateMemberDto {
  /** REMOVED is handled by DELETE; INVITED is only set by the invitation flow. */
  @TrimUpper()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  membershipStatus: 'ACTIVE' | 'SUSPENDED';
}

export class AssignRoleDto {
  @IsUUID()
  roleId: string;
}

export class ListMembersQueryDto {
  @IsOptional()
  @ToBoolean()
  includeRemoved?: boolean;
}

export class InvitationTokenDto {
  @IsString()
  @Length(20, 200)
  token: string;
}
