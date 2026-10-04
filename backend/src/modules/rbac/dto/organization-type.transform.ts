import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { ORGANIZATION_TYPES } from '../utils/role-scope.util.js';

/** Empty string or null clears the organization type and makes the role global. */
export const IsOptionalOrganizationType = () =>
  applyDecorators(
    IsOptional(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    IsIn(['', ...ORGANIZATION_TYPES], {
      message: `organizationType must be empty or one of: ${ORGANIZATION_TYPES.join(', ')}`,
    }),
  );
