/** Detect emails / phones so marketplace chat can keep contact details off-platform. */

export const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** International-ish phone shapes: +91 99909 92492, (022) 1234-5678, 9876543210 */
export const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;

/** Soft obfuscations like "name at gmail dot com" or "nine eight seven…" are out of scope. */
const OBFUSCATED_EMAIL =
  /\b[\w.+-]+\s*(?:\(|\[)?\s*(?:at|[@＠])\s*(?:\)|\])?\s*[\w.-]+\s*(?:\(|\[)?\s*(?:dot|\.)\s*(?:\)|\])?\s*[a-z]{2,}\b/gi;

export function containsEmail(text: string) {
  EMAIL_PATTERN.lastIndex = 0;
  OBFUSCATED_EMAIL.lastIndex = 0;
  return EMAIL_PATTERN.test(text) || OBFUSCATED_EMAIL.test(text);
}

export function containsPhone(text: string) {
  PHONE_PATTERN.lastIndex = 0;
  return PHONE_PATTERN.test(text);
}

export function containsContactInfo(text: string) {
  return containsEmail(text) || containsPhone(text);
}

/** Strip emails and phone numbers from free text shown before award. */
export function scrubContactInfo(text: string) {
  return text.replace(EMAIL_PATTERN, '[hidden]').replace(PHONE_PATTERN, '[hidden]');
}

export const CONTACT_INFO_BLOCKED_MESSAGE =
  'For your safety, phone numbers and email addresses cannot be shared in chat. Keep communication on TIC.';
