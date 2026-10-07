function prismaErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
}

export function isUniqueViolation(error: unknown) {
  return prismaErrorCode(error) === 'P2002';
}

/** A delete or update was blocked by a referencing row (ON DELETE RESTRICT). */
export function isForeignKeyViolation(error: unknown) {
  const code = prismaErrorCode(error);
  return code === 'P2003' || code === 'P2014';
}

export function isRecordNotFound(error: unknown) {
  return prismaErrorCode(error) === 'P2025';
}
