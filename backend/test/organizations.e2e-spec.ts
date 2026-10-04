import { createHash } from 'node:crypto';

import { AUDIT_ACTIONS } from '../src/common/audit/audit-actions.js';
import { AuditService } from '../src/common/audit/audit.service.js';
import { DEMO_USERS } from '../prisma/seed-data.js';
import { createTestApi, type TestApi } from './support/app.js';

type TestUser = Awaited<ReturnType<TestApi['createUser']>>;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('Organizations (e2e)', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await createTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('organization lifecycle', () => {
    let owner: TestUser;
    let orgId: string;

    beforeAll(async () => {
      owner = await api.createUser('owner');
    });

    it('creates an organization and makes the creator its owner atomically', async () => {
      const response = await api.post('/organizations', owner.token, {
        legalName: '  Lifecycle Labs Pvt Ltd ',
        displayName: 'Lifecycle Labs',
        organizationType: 'provider',
        countryCode: 'in',
        website: 'https://lifecycle.example.com',
      });
      expect(response.status).toBe(201);
      orgId = response.body.id;
      expect(response.body).toMatchObject({
        legalName: 'Lifecycle Labs Pvt Ltd',
        organizationType: 'PROVIDER',
        countryCode: 'IN',
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        memberCount: 1,
        membership: { isOwner: true, membershipStatus: 'ACTIVE' },
      });
      expect(response.body.membership.roles.map((role: { code: string }) => role.code)).toEqual(['PROVIDER_ADMIN']);

      const audit = await api.prisma.auditLog.findFirst({
        where: { action: AUDIT_ACTIONS.organizationCreated, organizationId: orgId },
      });
      expect(audit).toMatchObject({ actorUserId: owner.id, targetUserId: owner.id, entityId: orgId });
    });

    it('rejects invalid payloads and server-controlled fields', async () => {
      const base = { legalName: 'Bad Org Ltd', displayName: 'Bad Org' };
      expect((await api.post('/organizations', owner.token, { ...base, organizationType: 'SCHOOL' })).status).toBe(400);
      expect(
        (await api.post('/organizations', owner.token, { ...base, organizationType: 'BUYER', verificationStatus: 'VERIFIED' }))
          .status,
      ).toBe(400);
      expect(
        (await api.post('/organizations', owner.token, { ...base, organizationType: 'BUYER', countryCode: 'IND' })).status,
      ).toBe(400);
      expect((await api.post('/organizations', undefined, { ...base, organizationType: 'BUYER' })).status).toBe(401);
    });

    it('lists only organizations the user belongs to', async () => {
      const response = await api.get('/organizations', owner.token);
      expect(response.status).toBe(200);
      expect(response.body.map((org: { id: string }) => org.id)).toEqual([orgId]);
    });

    it('updates the profile and audits the change, ignoring no-op updates', async () => {
      const response = await api.patch(`/organizations/${orgId}`, owner.token, {
        displayName: 'Lifecycle Laboratories',
        description: 'Testing lab',
      });
      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('Lifecycle Laboratories');

      const audit = await api.prisma.auditLog.findFirst({
        where: { action: AUDIT_ACTIONS.organizationUpdated, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit?.metadata).toMatchObject({
        changes: { displayName: { from: 'Lifecycle Labs', to: 'Lifecycle Laboratories' } },
      });

      const before = await api.prisma.auditLog.count({ where: { organizationId: orgId } });
      await api.patch(`/organizations/${orgId}`, owner.token, { displayName: 'Lifecycle Laboratories' });
      expect(await api.prisma.auditLog.count({ where: { organizationId: orgId } })).toBe(before);
    });

    it('does not allow organization type or verification status changes through PATCH', async () => {
      expect((await api.patch(`/organizations/${orgId}`, owner.token, { organizationType: 'BUYER' })).status).toBe(400);
      expect((await api.patch(`/organizations/${orgId}`, owner.token, { verificationStatus: 'VERIFIED' })).status).toBe(400);
    });

    it('requires organizations.status edit to change status; only platform operators have it', async () => {
      expect((await api.patch(`/organizations/${orgId}`, owner.token, { status: 'INACTIVE' })).status).toBe(403);

      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      const suspended = await api.patch(`/organizations/${orgId}`, superAdmin, { status: 'SUSPENDED' });
      expect(suspended.status).toBe(200);
      expect(suspended.body.status).toBe('SUSPENDED');
      expect(
        await api.prisma.auditLog.count({ where: { action: AUDIT_ACTIONS.organizationStatusChanged, organizationId: orgId } }),
      ).toBe(1);

      // A suspended organization is read-only for its members.
      expect((await api.get(`/organizations/${orgId}`, owner.token)).status).toBe(200);
      const blocked = await api.patch(`/organizations/${orgId}`, owner.token, { description: 'still editing' });
      expect(blocked.status).toBe(403);
      expect(blocked.body.message).toBe('Organization is suspended');

      expect((await api.patch(`/organizations/${orgId}`, superAdmin, { status: 'ACTIVE' })).status).toBe(200);
      expect((await api.patch(`/organizations/${orgId}`, owner.token, { description: 'editable again' })).status).toBe(200);
    });
  });

  describe('invitations and membership', () => {
    let owner: TestUser;
    let invitee: TestUser;
    let outsider: TestUser;
    let orgId: string;

    beforeAll(async () => {
      [owner, invitee, outsider] = await Promise.all([
        api.createUser('inv-owner'),
        api.createUser('invitee'),
        api.createUser('outsider'),
      ]);
      orgId = (await api.createOrganization(owner, 'PROVIDER', 'Invite Org')).id;
    });

    it('invites a member, stores only a token hash and lets the invitee accept', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const invite = await api.post(`/organizations/${orgId}/members/invite`, owner.token, {
        email: invitee.email.toUpperCase(),
        roleId: providerUser,
      });
      expect(invite.status).toBe(201);
      expect(invite.body.invitation).toMatchObject({ email: invitee.email, status: 'PENDING' });
      expect(invite.body.devToken).toEqual(expect.any(String));

      const stored = await api.prisma.organizationInvitation.findUniqueOrThrow({ where: { id: invite.body.invitation.id } });
      expect(stored.tokenHash).toBe(sha256(invite.body.devToken));
      expect(stored.tokenHash).not.toContain(invite.body.devToken);

      // Existing users get an INVITED membership that grants no access yet.
      const pendingMembership = await api.prisma.organizationUser.findUniqueOrThrow({
        where: { organizationId_userId: { organizationId: orgId, userId: invitee.id } },
      });
      expect(pendingMembership.membershipStatus).toBe('INVITED');
      expect((await api.get(`/organizations/${orgId}`, invitee.token)).status).toBe(403);

      const pending = await api.get(`/organizations/${orgId}/invitations`, owner.token);
      expect(pending.body.map((entry: { id: string }) => entry.id)).toContain(invite.body.invitation.id);

      const preview = await api.post('/organization-invitations/preview', undefined, { token: invite.body.devToken });
      expect(preview.status).toBe(200);
      expect(preview.body).toMatchObject({ email: invitee.email, status: 'PENDING', role: { name: 'Provider User' } });

      const wrongUser = await api.post('/organization-invitations/accept', outsider.token, { token: invite.body.devToken });
      expect(wrongUser.status).toBe(403);

      const accepted = await api.post('/organization-invitations/accept', invitee.token, { token: invite.body.devToken });
      expect(accepted.status).toBe(200);
      expect(accepted.body.membership.membershipStatus).toBe('ACTIVE');
      expect(accepted.body.role.code).toBe('PROVIDER_USER');

      expect((await api.post('/organization-invitations/accept', invitee.token, { token: invite.body.devToken })).status).toBe(410);
      expect((await api.get(`/organizations/${orgId}`, invitee.token)).status).toBe(200);
      expect(
        await api.prisma.auditLog.count({ where: { action: AUDIT_ACTIONS.memberAccepted, organizationId: orgId } }),
      ).toBe(1);
    });

    it('rejects invitations for incompatible roles, active members and the inviter', async () => {
      const buyerUser = await api.roleId('BUYER_USER');
      const providerUser = await api.roleId('PROVIDER_USER');
      const globalUser = await api.roleId('USER');

      expect(
        (await api.post(`/organizations/${orgId}/members/invite`, owner.token, { email: 'x@example.com', roleId: buyerUser }))
          .status,
      ).toBe(400);
      expect(
        (await api.post(`/organizations/${orgId}/members/invite`, owner.token, { email: 'x@example.com', roleId: globalUser }))
          .status,
      ).toBe(400);
      expect(
        (await api.post(`/organizations/${orgId}/members/invite`, owner.token, { email: invitee.email, roleId: providerUser }))
          .status,
      ).toBe(409);
      expect(
        (await api.post(`/organizations/${orgId}/members/invite`, owner.token, { email: owner.email, roleId: providerUser }))
          .status,
      ).toBe(400);
    });

    it('cancels a pending invitation and voids its token', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const invite = await api.post(`/organizations/${orgId}/members/invite`, owner.token, {
        email: outsider.email,
        roleId: providerUser,
      });
      expect(invite.status).toBe(201);

      const cancelled = await api.delete(`/organizations/${orgId}/invitations/${invite.body.invitation.id}`, owner.token);
      expect(cancelled.status).toBe(200);

      const accept = await api.post('/organization-invitations/accept', outsider.token, { token: invite.body.devToken });
      expect(accept.status).toBe(410);
      const membership = await api.prisma.organizationUser.findUniqueOrThrow({
        where: { organizationId_userId: { organizationId: orgId, userId: outsider.id } },
      });
      expect(membership.membershipStatus).toBe('REMOVED');
    });

    it('suspends and reactivates a member; suspended members lose access', async () => {
      const memberId = await api.memberId(orgId, invitee.id);

      const suspended = await api.patch(`/organizations/${orgId}/members/${memberId}`, owner.token, {
        membershipStatus: 'SUSPENDED',
      });
      expect(suspended.status).toBe(200);
      expect(suspended.body.membershipStatus).toBe('SUSPENDED');

      const denied = await api.get(`/organizations/${orgId}`, invitee.token);
      expect(denied.status).toBe(403);
      expect((await api.get(`/organizations/${orgId}/members`, invitee.token)).status).toBe(403);
      expect((await api.get('/organizations', invitee.token)).body).toEqual([]);

      const me = await api.get('/auth/me', invitee.token);
      expect(me.body.organizations).toEqual([expect.objectContaining({ id: orgId, membershipStatus: 'SUSPENDED' })]);
      expect(me.body.activeOrganizationId).toBeNull();

      expect(
        (await api.patch(`/organizations/${orgId}/members/${memberId}`, owner.token, { membershipStatus: 'ACTIVE' })).status,
      ).toBe(200);
      expect((await api.get(`/organizations/${orgId}`, invitee.token)).status).toBe(200);

      const actions = await api.prisma.auditLog.findMany({
        where: { organizationId: orgId, targetUserId: invitee.id, action: { startsWith: 'ORGANIZATION_MEMBER_' } },
        select: { action: true },
      });
      expect(actions.map((entry) => entry.action)).toEqual(
        expect.arrayContaining([AUDIT_ACTIONS.memberSuspended, AUDIT_ACTIONS.memberReactivated]),
      );
    });

    it('does not allow members to change their own status', async () => {
      const ownerMemberId = await api.memberId(orgId, owner.id);
      const response = await api.patch(`/organizations/${orgId}/members/${ownerMemberId}`, owner.token, {
        membershipStatus: 'SUSPENDED',
      });
      expect(response.status).toBe(400);
    });

    it('removes a member by status change without deleting the row', async () => {
      const memberId = await api.memberId(orgId, invitee.id);
      expect((await api.delete(`/organizations/${orgId}/members/${memberId}`, owner.token)).status).toBe(200);

      const row = await api.prisma.organizationUser.findUniqueOrThrow({ where: { id: memberId }, include: { roles: true } });
      expect(row.membershipStatus).toBe('REMOVED');
      expect(row.roles).toEqual([]);

      expect((await api.get(`/organizations/${orgId}`, invitee.token)).status).toBe(403);
      expect((await api.get('/organizations/current', invitee.token, orgId)).status).toBe(403);

      const members = await api.get(`/organizations/${orgId}/members`, owner.token);
      expect(members.body.map((member: { id: string }) => member.id)).not.toContain(memberId);
      const withRemoved = await api.get(`/organizations/${orgId}/members?includeRemoved=true`, owner.token);
      expect(withRemoved.body.map((member: { id: string }) => member.id)).toContain(memberId);
    });

    it('removing an invited member voids their outstanding invitation', async () => {
      const pendingUser = await api.createUser('pending');
      const invite = await api.post(`/organizations/${orgId}/members/invite`, owner.token, {
        email: pendingUser.email,
        roleId: await api.roleId('PROVIDER_USER'),
      });
      const pendingMemberId = await api.memberId(orgId, pendingUser.id);

      expect((await api.delete(`/organizations/${orgId}/members/${pendingMemberId}`, owner.token)).status).toBe(200);
      const accept = await api.post('/organization-invitations/accept', pendingUser.token, { token: invite.body.devToken });
      expect(accept.status).toBe(410);
      expect((await api.get(`/organizations/${orgId}`, pendingUser.token)).status).toBe(403);
    });

    it('lets a removed member rejoin through a new invitation', async () => {
      const membershipId = await api.addMember(orgId, owner, invitee, 'PROVIDER_USER');
      expect(membershipId).toBe(await api.memberId(orgId, invitee.id));
      expect((await api.get(`/organizations/${orgId}`, invitee.token)).status).toBe(200);
    });
  });

  describe('organization roles', () => {
    let owner: TestUser;
    let member: TestUser;
    let other: TestUser;
    let orgId: string;
    let memberId: string;
    let otherId: string;

    beforeAll(async () => {
      [owner, member, other] = await Promise.all([
        api.createUser('roles-owner'),
        api.createUser('roles-member'),
        api.createUser('roles-other'),
      ]);
      orgId = (await api.createOrganization(owner, 'PROVIDER', 'Roles Org')).id;
      memberId = await api.addMember(orgId, owner, member, 'PROVIDER_USER');
      otherId = await api.addMember(orgId, owner, other, 'PROVIDER_USER');
    });

    it('grants and revokes permissions immediately when roles change', async () => {
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      expect((await api.patch(`/organizations/${orgId}`, member.token, { description: 'by member' })).status).toBe(403);

      const assigned = await api.post(`/organizations/${orgId}/members/${memberId}/roles`, owner.token, { roleId: providerAdmin });
      expect(assigned.status).toBe(201);
      expect(assigned.body.map((role: { code: string }) => role.code).sort()).toEqual(['PROVIDER_ADMIN', 'PROVIDER_USER']);
      expect((await api.patch(`/organizations/${orgId}`, member.token, { description: 'by member' })).status).toBe(200);

      const removed = await api.delete(`/organizations/${orgId}/members/${memberId}/roles/${providerAdmin}`, owner.token);
      expect(removed.status).toBe(200);
      expect(removed.body.map((role: { code: string }) => role.code)).toEqual(['PROVIDER_USER']);
      expect((await api.patch(`/organizations/${orgId}`, member.token, { description: 'again' })).status).toBe(403);

      const audits = await api.prisma.auditLog.findMany({
        where: { organizationId: orgId, targetUserId: member.id, action: { in: [AUDIT_ACTIONS.roleAssigned, AUDIT_ACTIONS.roleRemoved] } },
      });
      expect(audits.map((entry) => entry.action)).toEqual(
        expect.arrayContaining([AUDIT_ACTIONS.roleAssigned, AUDIT_ACTIONS.roleRemoved]),
      );
      expect(audits.every((entry) => entry.actorUserId === owner.id)).toBe(true);
    });

    it('validates role existence, activity, compatibility and duplicates', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const buyerAdmin = await api.roleId('BUYER_ADMIN');
      const superAdmin = await api.roleId('SUPER_ADMIN');
      const inactive = await api.prisma.role.create({
        data: { code: `PROVIDER_INACTIVE_${Date.now()}`, name: 'Inactive provider role', organizationType: 'PROVIDER', isActive: false },
      });

      const assign = (roleId: string) =>
        api.post(`/organizations/${orgId}/members/${memberId}/roles`, owner.token, { roleId });

      expect((await assign('00000000-0000-4000-8000-000000000000')).status).toBe(404);
      expect((await assign(inactive.id)).status).toBe(400);
      expect((await assign(buyerAdmin)).status).toBe(400);
      expect((await assign(superAdmin)).status).toBe(400);
      expect((await assign(providerUser)).status).toBe(409);
      expect(
        (await api.delete(`/organizations/${orgId}/members/${memberId}/roles/${buyerAdmin}`, owner.token)).status,
      ).toBe(404);
    });

    it('prevents users from changing their own roles', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      const ownerMemberId = await api.memberId(orgId, owner.id);
      expect(
        (await api.post(`/organizations/${orgId}/members/${ownerMemberId}/roles`, owner.token, { roleId: providerUser })).status,
      ).toBe(403);
      expect(
        (await api.delete(`/organizations/${orgId}/members/${ownerMemberId}/roles/${providerAdmin}`, owner.token)).status,
      ).toBe(403);
    });

    it('applies organization role overrides and blocks privilege escalation', async () => {
      // A custom provider role: viewer baseline plus an override allowing role assignment.
      const [viewer, memberRoles] = await Promise.all([
        api.prisma.accessLevel.findUniqueOrThrow({ where: { code: 'VIEWER' } }),
        api.prisma.functionality.findFirstOrThrow({ where: { code: 'organizations.member_roles' } }),
      ]);
      const manager = await api.prisma.role.create({
        data: {
          code: `PROVIDER_ROLE_MANAGER_${Date.now()}`,
          name: 'Provider role manager',
          organizationType: 'PROVIDER',
          baselineAccessLevelId: viewer.id,
          permissions: { create: { functionalityId: memberRoles.id, canCreate: true, canDelete: true } },
        },
      });

      expect(
        (await api.post(`/organizations/${orgId}/members/${memberId}/roles`, owner.token, { roleId: manager.id })).status,
      ).toBe(201);

      const context = await api.get('/organizations/current', member.token, orgId);
      const memberRolesFlags = context.body.permissions.find(
        (entry: { functionalityCode: string }) => entry.functionalityCode === 'organizations.member_roles',
      );
      expect(memberRolesFlags).toMatchObject({ canView: true, canCreate: true, canDelete: true, canEdit: false });

      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      const escalate = await api.post(`/organizations/${orgId}/members/${otherId}/roles`, member.token, { roleId: providerAdmin });
      expect(escalate.status).toBe(403);

      const roles = await api.get(`/organizations/${orgId}/roles`, member.token);
      const assignable = Object.fromEntries(
        roles.body.map((role: { code: string; assignable: boolean }) => [role.code, role.assignable]),
      );
      expect(assignable.PROVIDER_ADMIN).toBe(false);
      expect(Object.keys(assignable)).not.toContain('BUYER_ADMIN');

      // Removing a role the actor could not grant is also blocked.
      await api.post(`/organizations/${orgId}/members/${otherId}/roles`, owner.token, { roleId: providerAdmin });
      expect(
        (await api.delete(`/organizations/${orgId}/members/${otherId}/roles/${providerAdmin}`, member.token)).status,
      ).toBe(403);
    });

    it('cannot assign roles to suspended members', async () => {
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      await api.delete(`/organizations/${orgId}/members/${otherId}/roles/${providerAdmin}`, owner.token);
      await api.patch(`/organizations/${orgId}/members/${otherId}`, owner.token, { membershipStatus: 'SUSPENDED' });
      expect(
        (await api.post(`/organizations/${orgId}/members/${otherId}/roles`, owner.token, { roleId: providerAdmin })).status,
      ).toBe(400);
    });
  });

  describe('ownership', () => {
    let owner: TestUser;
    let admin: TestUser;
    let viewer: TestUser;
    let orgId: string;
    let ownerMemberId: string;
    let adminMemberId: string;
    let viewerMemberId: string;

    beforeAll(async () => {
      [owner, admin, viewer] = await Promise.all([
        api.createUser('own-owner'),
        api.createUser('own-admin'),
        api.createUser('own-viewer'),
      ]);
      orgId = (await api.createOrganization(owner, 'BUYER', 'Ownership Org')).id;
      ownerMemberId = await api.memberId(orgId, owner.id);
      adminMemberId = await api.addMember(orgId, owner, admin, 'BUYER_ADMIN');
      viewerMemberId = await api.addMember(orgId, owner, viewer, 'BUYER_USER');
    });

    it('the creator is the only initial owner', async () => {
      const owners = await api.prisma.organizationUser.findMany({ where: { organizationId: orgId, isOwner: true } });
      expect(owners.map((entry) => entry.userId)).toEqual([owner.id]);
    });

    it('the last active owner cannot leave or be removed', async () => {
      const leave = await api.post(`/organizations/${orgId}/leave`, owner.token);
      expect(leave.status).toBe(409);

      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      expect((await api.delete(`/organizations/${orgId}/members/${ownerMemberId}`, superAdmin)).status).toBe(409);
      expect(
        (await api.patch(`/organizations/${orgId}/members/${ownerMemberId}`, superAdmin, { membershipStatus: 'SUSPENDED' }))
          .status,
      ).toBe(409);
    });

    it('non-owner admins cannot remove, suspend or replace the owner', async () => {
      expect((await api.delete(`/organizations/${orgId}/members/${ownerMemberId}`, admin.token)).status).toBe(403);
      expect(
        (await api.patch(`/organizations/${orgId}/members/${ownerMemberId}`, admin.token, { membershipStatus: 'SUSPENDED' }))
          .status,
      ).toBe(403);
      expect((await api.post(`/organizations/${orgId}/members/${adminMemberId}/transfer-ownership`, admin.token)).status).toBe(400);
      expect((await api.post(`/organizations/${orgId}/members/${viewerMemberId}/transfer-ownership`, admin.token)).status).toBe(403);
    });

    it('rolls back the whole transfer when any step fails', async () => {
      const audit = api.app.get(AuditService);
      const original = audit.log.bind(audit);
      vi.spyOn(audit, 'log').mockImplementation(async (entry, client) => {
        if (entry.action === AUDIT_ACTIONS.ownershipTransferred) {
          throw new Error('simulated audit failure');
        }
        return original(entry, client);
      });

      const response = await api.post(`/organizations/${orgId}/members/${adminMemberId}/transfer-ownership`, owner.token);
      expect(response.status).toBe(500);

      const owners = await api.prisma.organizationUser.findMany({ where: { organizationId: orgId, isOwner: true } });
      expect(owners.map((entry) => entry.id)).toEqual([ownerMemberId]);
    });

    it('cannot transfer ownership to a suspended member', async () => {
      await api.patch(`/organizations/${orgId}/members/${viewerMemberId}`, owner.token, { membershipStatus: 'SUSPENDED' });
      expect((await api.post(`/organizations/${orgId}/members/${viewerMemberId}/transfer-ownership`, owner.token)).status).toBe(400);
      await api.patch(`/organizations/${orgId}/members/${viewerMemberId}`, owner.token, { membershipStatus: 'ACTIVE' });
    });

    it('transfers ownership atomically and audits it', async () => {
      const response = await api.post(`/organizations/${orgId}/members/${adminMemberId}/transfer-ownership`, owner.token);
      expect(response.status).toBe(200);

      const owners = await api.prisma.organizationUser.findMany({ where: { organizationId: orgId, isOwner: true } });
      expect(owners.map((entry) => entry.id)).toEqual([adminMemberId]);

      const audit = await api.prisma.auditLog.findFirst({
        where: { action: AUDIT_ACTIONS.ownershipTransferred, organizationId: orgId },
      });
      expect(audit).toMatchObject({ actorUserId: owner.id, targetUserId: admin.id });
      expect(audit?.metadata).toMatchObject({ fromUserIds: [owner.id], toUserId: admin.id });
    });

    it('the former owner keeps their role and can now leave', async () => {
      const details = await api.get(`/organizations/${orgId}`, owner.token);
      expect(details.body.membership.isOwner).toBe(false);
      expect(details.body.membership.roles.map((role: { code: string }) => role.code)).toEqual(['BUYER_ADMIN']);

      expect((await api.post(`/organizations/${orgId}/leave`, owner.token)).status).toBe(200);
      expect((await api.get(`/organizations/${orgId}`, owner.token)).status).toBe(403);
      expect(
        await api.prisma.auditLog.count({ where: { action: AUDIT_ACTIONS.memberLeft, organizationId: orgId } }),
      ).toBe(1);
    });

    it('serializes concurrent removals so an owner always remains', async () => {
      // Make the viewer a second owner via platform transfer, then race two removals.
      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      await api.prisma.organizationUser.update({ where: { id: viewerMemberId }, data: { isOwner: true } });

      const [first, second] = await Promise.all([
        api.delete(`/organizations/${orgId}/members/${adminMemberId}`, superAdmin),
        api.delete(`/organizations/${orgId}/members/${viewerMemberId}`, superAdmin),
      ]);
      expect([first.status, second.status].sort()).toEqual([200, 409]);
      expect(
        await api.prisma.organizationUser.count({
          where: { organizationId: orgId, isOwner: true, membershipStatus: 'ACTIVE' },
        }),
      ).toBe(1);
    });
  });

  describe('global RBAC stays separate', () => {
    it('global permission checks still work', async () => {
      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      const john = await api.login(DEMO_USERS.john.email);
      expect((await api.get('/rbac/roles', superAdmin)).status).toBe(200);
      expect((await api.get('/rbac/roles', john)).status).toBe(403);
    });

    it('organization roles cannot be assigned as global roles', async () => {
      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      const john = await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.john.email } });
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      const response = await api.post(`/rbac/users/${john.id}/roles`, superAdmin, { roleId: providerAdmin });
      expect(response.status).toBe(400);
      expect(await api.prisma.userRole.count({ where: { userId: john.id, roleId: providerAdmin } })).toBe(0);
    });

    it('organization roles do not leak into global permissions', async () => {
      const john = await api.login(DEMO_USERS.john.email);
      const me = await api.get('/auth/me', john);
      expect(me.body.permissions.some((entry: { functionalityCode: string }) => entry.functionalityCode.startsWith('organizations.'))).toBe(false);
    });
  });
});
