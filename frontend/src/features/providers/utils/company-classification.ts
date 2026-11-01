/**
 * Detect legal-entity / company classifications so independent professionals
 * cannot register under PVT LTD, LLP, and similar company names.
 */

const COMPANY_CLASSIFICATION_PATTERN =
  /\b(?:(?:pvt|private)\.?\s*ltd\.?|private\s+limited|ltd\.?|limited|llp|llc|l\.?l\.?c\.?|inc\.?|incorporated|corp\.?|corporation|opc|plc|gmbh|s\.?a\.?|b\.?v\.?|pte\.?|pty\.?|co\.?(?:\s|,|$)|company|partnership|proprietorship|sole\s+prop(?:rietor)?|fze|fz[- ]?co|trust|foundation|holdings?)\b/i;

export function containsCompanyClassification(name: string) {
  return COMPANY_CLASSIFICATION_PATTERN.test(name.trim());
}

export const COMPANY_CLASSIFICATION_BLOCKED_MESSAGE =
  "Independent professional profiles must use a personal name. Company classifications such as PVT LTD, LLP, Ltd, LLC, Inc, or Corp are not allowed.";
