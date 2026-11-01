import { describe, expect, it } from 'vitest';

import { containsCompanyClassification } from './company-classification.js';

describe('containsCompanyClassification', () => {
  it('allows personal names', () => {
    expect(containsCompanyClassification('Priya Sharma')).toBe(false);
    expect(containsCompanyClassification('Arjun Mehta')).toBe(false);
  });

  it('blocks common Indian and global company classifications', () => {
    expect(containsCompanyClassification('ABC Testing Pvt Ltd')).toBe(true);
    expect(containsCompanyClassification('Quality Labs PVT. LTD.')).toBe(true);
    expect(containsCompanyClassification('Green Audit LLP')).toBe(true);
    expect(containsCompanyClassification('Acme Inspection LLC')).toBe(true);
    expect(containsCompanyClassification('Northstar Consulting Ltd')).toBe(true);
    expect(containsCompanyClassification('Orbit Services Private Limited')).toBe(true);
    expect(containsCompanyClassification('Delta Corp')).toBe(true);
  });
});
