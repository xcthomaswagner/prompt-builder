/**
 * Unit tests for roleService
 */

import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ROLE_LABELS,
  DEFAULT_ORG_SETTINGS,
  hasPermission,
  canManageRole,
  getAssignableRoles,
  isOnlyOwner,
  getUserRole,
  isOrgAdmin,
  isOrgOwner,
  createMember,
  createOrganization,
  validateRoleChange,
} from './roleService';

describe('roleService', () => {
  describe('ROLES', () => {
    it('should have correct role hierarchy', () => {
      expect(ROLES.member).toBeLessThan(ROLES.admin);
      expect(ROLES.admin).toBeLessThan(ROLES.owner);
    });
  });

  describe('ROLE_LABELS', () => {
    it('should have labels for all roles', () => {
      expect(ROLE_LABELS.owner).toBe('Owner');
      expect(ROLE_LABELS.admin).toBe('Admin');
      expect(ROLE_LABELS.member).toBe('Member');
    });
  });

  describe('DEFAULT_ORG_SETTINGS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_ORG_SETTINGS.allowUserKeys).toBe(true);
      expect(DEFAULT_ORG_SETTINGS.requireOrgKeys).toBe(false);
      expect(DEFAULT_ORG_SETTINGS.defaultProvider).toBe('gemini');
      expect(DEFAULT_ORG_SETTINGS.usageAlerts.enabled).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should allow owner all permissions', () => {
      expect(hasPermission('owner', 'VIEW_ORG_API_KEYS')).toBe(true);
      expect(hasPermission('owner', 'DELETE_ORGANIZATION')).toBe(true);
      expect(hasPermission('owner', 'ACCESS_ADMIN_PANEL')).toBe(true);
    });

    it('should allow admin most permissions except owner-only', () => {
      expect(hasPermission('admin', 'VIEW_ORG_API_KEYS')).toBe(true);
      expect(hasPermission('admin', 'MANAGE_ROLES')).toBe(true);
      expect(hasPermission('admin', 'DELETE_ORGANIZATION')).toBe(false);
      expect(hasPermission('admin', 'TRANSFER_OWNERSHIP')).toBe(false);
    });

    it('should restrict member permissions', () => {
      expect(hasPermission('member', 'VIEW_ORG_API_KEYS')).toBe(false);
      expect(hasPermission('member', 'USE_ORG_API_KEYS')).toBe(true);
      expect(hasPermission('member', 'MANAGE_PERSONAL_KEYS')).toBe(true);
      expect(hasPermission('member', 'ACCESS_ADMIN_PANEL')).toBe(false);
    });

    it('should return false for unknown permissions', () => {
      expect(hasPermission('owner', 'UNKNOWN_PERMISSION')).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should allow owner to manage all roles', () => {
      expect(canManageRole('owner', 'admin')).toBe(true);
      expect(canManageRole('owner', 'member')).toBe(true);
      expect(canManageRole('owner', 'owner')).toBe(true);
    });

    it('should allow admin to manage only members', () => {
      expect(canManageRole('admin', 'member')).toBe(true);
      expect(canManageRole('admin', 'admin')).toBe(false);
      expect(canManageRole('admin', 'owner')).toBe(false);
    });

    it('should not allow member to manage anyone', () => {
      expect(canManageRole('member', 'member')).toBe(false);
      expect(canManageRole('member', 'admin')).toBe(false);
      expect(canManageRole('member', 'owner')).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return admin and member for owner', () => {
      const roles = getAssignableRoles('owner');
      expect(roles).toContain('admin');
      expect(roles).toContain('member');
      expect(roles).not.toContain('owner');
    });

    it('should return only member for admin', () => {
      const roles = getAssignableRoles('admin');
      expect(roles).toContain('member');
      expect(roles).not.toContain('admin');
      expect(roles).not.toContain('owner');
    });

    it('should return empty array for member', () => {
      const roles = getAssignableRoles('member');
      expect(roles).toHaveLength(0);
    });
  });

  describe('isOnlyOwner', () => {
    it('should return true if user is the only owner', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'admin' },
      };
      expect(isOnlyOwner(members, 'user1')).toBe(true);
    });

    it('should return false if there are multiple owners', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'owner' },
      };
      expect(isOnlyOwner(members, 'user1')).toBe(false);
    });

    it('should return false if user is not an owner', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'admin' },
      };
      expect(isOnlyOwner(members, 'user2')).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return user role', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'admin' },
      };
      expect(getUserRole(members, 'user1')).toBe('owner');
      expect(getUserRole(members, 'user2')).toBe('admin');
    });

    it('should return null for non-member', () => {
      const members = { 'user1': { role: 'owner' } };
      expect(getUserRole(members, 'user2')).toBe(null);
    });

    it('should handle null/undefined members', () => {
      expect(getUserRole(null, 'user1')).toBe(null);
      expect(getUserRole(undefined, 'user1')).toBe(null);
    });
  });

  describe('isOrgAdmin', () => {
    it('should return true for owner and admin', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'admin' },
        'user3': { role: 'member' },
      };
      expect(isOrgAdmin(members, 'user1')).toBe(true);
      expect(isOrgAdmin(members, 'user2')).toBe(true);
      expect(isOrgAdmin(members, 'user3')).toBe(false);
    });
  });

  describe('isOrgOwner', () => {
    it('should return true only for owner', () => {
      const members = {
        'user1': { role: 'owner' },
        'user2': { role: 'admin' },
      };
      expect(isOrgOwner(members, 'user1')).toBe(true);
      expect(isOrgOwner(members, 'user2')).toBe(false);
    });
  });

  describe('createMember', () => {
    it('should create member with required fields', () => {
      const member = createMember({
        role: 'admin',
        email: 'test@example.com',
        displayName: 'Test User',
        invitedBy: 'owner-id',
      });

      expect(member.role).toBe('admin');
      expect(member.email).toBe('test@example.com');
      expect(member.displayName).toBe('Test User');
      expect(member.invitedBy).toBe('owner-id');
      expect(member.joinedAt).toBeInstanceOf(Date);
    });

    it('should use defaults for optional fields', () => {
      const member = createMember({
        role: 'member',
        email: 'test@example.com',
      });

      expect(member.displayName).toBe('');
      expect(member.invitedBy).toBe(null);
    });
  });

  describe('createOrganization', () => {
    it('should create organization with owner', () => {
      const org = createOrganization(
        'Test Org',
        'owner-id',
        'owner@example.com',
        'Owner Name'
      );

      expect(org.name).toBe('Test Org');
      expect(org.createdBy).toBe('owner-id');
      expect(org.members['owner-id'].role).toBe('owner');
      expect(org.members['owner-id'].email).toBe('owner@example.com');
      expect(org.settings).toEqual(DEFAULT_ORG_SETTINGS);
      expect(org.apiKeys).toEqual({});
    });
  });

  describe('validateRoleChange', () => {
    it('should reject same role', () => {
      const result = validateRoleChange({
        actorRole: 'owner',
        currentRole: 'admin',
        newRole: 'admin',
        isOnlyOwner: false,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already set');
    });

    it('should reject demoting only owner', () => {
      const result = validateRoleChange({
        actorRole: 'owner',
        currentRole: 'owner',
        newRole: 'admin',
        isOnlyOwner: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only owner');
    });

    it('should reject admin managing other admins', () => {
      const result = validateRoleChange({
        actorRole: 'admin',
        currentRole: 'admin',
        newRole: 'member',
        isOnlyOwner: false,
      });
      expect(result.valid).toBe(false);
    });

    it('should allow valid role change', () => {
      const result = validateRoleChange({
        actorRole: 'owner',
        currentRole: 'member',
        newRole: 'admin',
        isOnlyOwner: false,
      });
      expect(result.valid).toBe(true);
    });
  });
});
