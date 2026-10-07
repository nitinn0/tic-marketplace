import { ConflictException } from '@nestjs/common';

import { isForeignKeyViolation, isUniqueViolation } from '../../common/utils/prisma-errors.js';

export { diffChanges, optionalText } from '../../common/utils/record-changes.js';

export type DeleteOutcome = { id: string; deleted: boolean; deactivated: boolean };

export function matchesSearch(search: string | undefined, ...values: Array<string | null | undefined>) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

export async function withUniqueConflict<T>(operation: () => Promise<T>, message: (target: string) => string) {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueViolation(error)) {
      const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
      throw new ConflictException(message(Array.isArray(target) ? target.join(', ') : (target ?? 'value')));
    }
    throw error;
  }
}

/**
 * Master data that is still referenced (child nodes, provider capabilities and, later, RFQs) is
 * never physically deleted: the ON DELETE RESTRICT foreign key rejects the delete and the record
 * is deactivated instead.
 */
export async function deleteOrDeactivate(
  id: string,
  remove: () => Promise<unknown>,
  deactivate: () => Promise<unknown>,
): Promise<DeleteOutcome> {
  try {
    await remove();
    return { id, deleted: true, deactivated: false };
  } catch (error) {
    if (!isForeignKeyViolation(error)) throw error;
    await deactivate();
    return { id, deleted: false, deactivated: true };
  }
}
