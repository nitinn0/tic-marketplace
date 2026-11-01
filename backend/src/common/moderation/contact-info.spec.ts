import { containsContactInfo, scrubContactInfo } from './contact-info.js';

describe('contact-info moderation', () => {
  it('detects emails and phones', () => {
    expect(containsContactInfo('Reach me at priya@acme.com')).toBe(true);
    expect(containsContactInfo('Call +91 99909 92492')).toBe(true);
    expect(containsContactInfo('priya at gmail dot com')).toBe(true);
    expect(containsContactInfo('Can we schedule a site visit next week?')).toBe(false);
  });

  it('scrubs contact details', () => {
    expect(scrubContactInfo('Contact priya@acme.com or +91 99909 92492')).toBe(
      'Contact [hidden] or [hidden]',
    );
  });
});
