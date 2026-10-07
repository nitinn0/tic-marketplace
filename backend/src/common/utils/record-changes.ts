import type { Prisma } from '@prisma/client';

/** Undefined means "not provided"; an empty string clears an optional text column. */
export function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === null || value === '' ? null : value;
}

/** Records only the fields whose value actually changes, for update payloads and audit metadata. */
export function diffChanges<T extends Record<string, unknown>>(current: T, next: Partial<T>) {
  const data: Record<string, unknown> = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || isSameValue(value, current[key])) continue;
    data[key] = value;
    changes[key] = { from: current[key], to: value };
  }
  return {
    data: data as Partial<T>,
    changes: changes as Prisma.InputJsonObject,
    changed: Object.keys(changes).length > 0,
  };
}

function isSameValue(a: unknown, b: unknown) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}
