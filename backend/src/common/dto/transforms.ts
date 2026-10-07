import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

/**
 * Optional field that must not be null (for non-nullable columns). `@IsOptional()` would let
 * `null` skip validation and reach the database.
 */
export const OptionalNotNull = () => ValidateIf((_object, value) => value !== undefined);

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and collapses runs of whitespace into a single space. */
export const Squish = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value));

export const TrimUpper = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

export const TrimLower = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export const ToBoolean = () =>
  Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown>)[key];
    return raw === true || raw === 'true' || raw === '1';
  });

/**
 * Tri-state boolean for query strings: absent stays undefined. Reads the raw value because
 * implicit conversion would turn the string "false" into `true`.
 */
export const ToOptionalBoolean = () =>
  Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown>)[key];
    if (raw === undefined || raw === '') return undefined;
    if (raw === true || raw === 'true' || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === '0') return false;
    return raw;
  });
