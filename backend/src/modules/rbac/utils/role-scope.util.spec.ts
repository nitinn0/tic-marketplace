import { isGlobalRole, isRoleCompatibleWithOrganization, normalizeOrganizationType } from './role-scope.util.js';

describe('role scope utilities', () => {
  it('normalizes organization types', () => {
    expect(normalizeOrganizationType(' provider ')).toBe('PROVIDER');
    expect(normalizeOrganizationType('BUYER')).toBe('BUYER');
    expect(normalizeOrganizationType('')).toBeNull();
    expect(normalizeOrganizationType('school')).toBeNull();
    expect(normalizeOrganizationType(null)).toBeNull();
  });

  it('treats roles without an organization type as global', () => {
    expect(isGlobalRole({ organizationType: null })).toBe(true);
    expect(isGlobalRole({ organizationType: '  ' })).toBe(true);
    expect(isGlobalRole({ organizationType: 'PROVIDER' })).toBe(false);
  });

  it('only allows active roles of the matching organization type', () => {
    expect(isRoleCompatibleWithOrganization({ organizationType: 'PROVIDER', isActive: true }, 'PROVIDER')).toBe(true);
    expect(isRoleCompatibleWithOrganization({ organizationType: 'BUYER', isActive: true }, 'PROVIDER')).toBe(false);
    expect(isRoleCompatibleWithOrganization({ organizationType: 'PROVIDER', isActive: false }, 'PROVIDER')).toBe(false);
    expect(isRoleCompatibleWithOrganization({ organizationType: null, isActive: true }, 'PROVIDER')).toBe(false);
  });
});
