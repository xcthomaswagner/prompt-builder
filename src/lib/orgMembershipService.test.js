/**
 * Tests for orgMembershipService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateInviteCode,
  getUserOrganizations,
  createOrganization,
  createInvite,
  getInvite,
  acceptInvite,
} from './orgMembershipService';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ path: `${collection}/${id}` })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  arrayUnion: vi.fn((val) => ({ _arrayUnion: val })),
  arrayRemove: vi.fn((val) => ({ _arrayRemove: val })),
}));

import { doc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';

describe('orgMembershipService', () => {
  const mockDb = { _db: true };
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInviteCode', () => {
    it('should generate an 8-character code', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it('should only contain valid characters', () => {
      const code = generateInviteCode();
      const validChars = /^[A-Z0-9]+$/;
      expect(code).toMatch(validChars);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // Should have at least 95 unique codes out of 100
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not contain confusing characters (0, O, 1, I, L)', () => {
      // Generate many codes and check none contain confusing chars
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        expect(code).not.toMatch(/[0OIL1]/);
      }
    });
  });

  describe('getUserOrganizations', () => {
    it('should return personal org if no memberships', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const orgs = await getUserOrganizations(mockDb, 'user123');

      expect(orgs).toHaveLength(1);
      expect(orgs[0]).toEqual({
        id: 'org_user123',
        name: 'Personal',
        role: 'owner',
        isPersonal: true,
      });
    });

    it('should return empty array if no db', async () => {
      const orgs = await getUserOrganizations(null, 'user123');
      expect(orgs).toEqual([]);
    });

    it('should return empty array if no userId', async () => {
      const orgs = await getUserOrganizations(mockDb, null);
      expect(orgs).toEqual([]);
    });

    it('should include additional orgs from membership list', async () => {
      // User doc with memberships
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizations: ['org_team1'] }),
      });

      // Team org doc
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          name: 'Team Org',
          members: { user123: { role: 'admin' } },
        }),
      });

      const orgs = await getUserOrganizations(mockDb, 'user123');

      expect(orgs).toHaveLength(2);
      expect(orgs[0].isPersonal).toBe(true);
      expect(orgs[1]).toEqual({
        id: 'org_team1',
        name: 'Team Org',
        role: 'admin',
        isPersonal: false,
      });
    });
  });

  describe('createOrganization', () => {
    it('should create org with creator as owner', async () => {
      setDoc.mockResolvedValue();
      updateDoc.mockResolvedValue();

      const orgId = await createOrganization(mockDb, 'Test Org', mockUser);

      expect(orgId).toMatch(/^org_\d+_[a-z0-9]+$/);
      expect(setDoc).toHaveBeenCalled();
      
      const setDocCall = setDoc.mock.calls[0];
      const orgData = setDocCall[1];
      
      expect(orgData.name).toBe('Test Org');
      expect(orgData.members[mockUser.uid].role).toBe('owner');
      expect(orgData.settings.isConfigured).toBe(true);
    });

    it('should throw if missing parameters', async () => {
      await expect(createOrganization(null, 'Test', mockUser))
        .rejects.toThrow('Missing required parameters');
      
      await expect(createOrganization(mockDb, '', mockUser))
        .rejects.toThrow('Missing required parameters');
      
      await expect(createOrganization(mockDb, 'Test', null))
        .rejects.toThrow('Missing required parameters');
    });
  });

  describe('createInvite', () => {
    it('should create invite with default settings', async () => {
      setDoc.mockResolvedValue();

      const invite = await createInvite(mockDb, 'org123', 'user123');

      expect(invite.code).toHaveLength(8);
      expect(invite.orgId).toBe('org123');
      expect(invite.role).toBe('member');
      expect(invite.maxUses).toBe(0);
      expect(invite.uses).toBe(0);
    });

    it('should create invite with custom settings', async () => {
      setDoc.mockResolvedValue();

      const invite = await createInvite(mockDb, 'org123', 'user123', 'admin', 5, 30);

      expect(invite.role).toBe('admin');
      expect(invite.maxUses).toBe(5);
      expect(invite.expiresAt).not.toBeNull();
    });

    it('should throw if missing parameters', async () => {
      await expect(createInvite(null, 'org123', 'user123'))
        .rejects.toThrow('Missing required parameters');
    });
  });

  describe('getInvite', () => {
    it('should return null for invalid code', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const invite = await getInvite(mockDb, 'INVALID1');
      expect(invite).toBeNull();
    });

    it('should return invite data for valid code', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          orgId: 'org123',
          role: 'member',
          maxUses: 0,
          uses: 0,
        }),
      });

      const invite = await getInvite(mockDb, 'ABC12DEF');
      expect(invite.code).toBe('ABC12DEF');
      expect(invite.orgId).toBe('org123');
    });

    it('should mark expired invites', async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          expiresAt: { toDate: () => pastDate },
          maxUses: 0,
          uses: 0,
        }),
      });

      const invite = await getInvite(mockDb, 'ABC12DEF');
      expect(invite.expired).toBe(true);
    });

    it('should mark exhausted invites', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          maxUses: 5,
          uses: 5,
        }),
      });

      const invite = await getInvite(mockDb, 'ABC12DEF');
      expect(invite.exhausted).toBe(true);
    });
  });

  describe('acceptInvite', () => {
    it('should return error for invalid code', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const result = await acceptInvite(mockDb, 'INVALID1', mockUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid invite code');
    });

    it('should return error if already a member', async () => {
      // Invite doc
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          orgId: 'org123',
          role: 'member',
          maxUses: 0,
          uses: 0,
          usedBy: [],
        }),
      });

      // Org doc - user already a member
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          name: 'Test Org',
          members: { user123: { role: 'member' } },
        }),
      });

      const result = await acceptInvite(mockDb, 'ABC12DEF', mockUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('You are already a member of this organization');
    });

    it('should successfully join org with valid invite', async () => {
      // Invite doc
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          orgId: 'org123',
          role: 'member',
          maxUses: 0,
          uses: 0,
          usedBy: [],
          createdBy: 'admin123',
        }),
      });

      // Org doc
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          name: 'Test Org',
          members: {},
        }),
      });

      updateDoc.mockResolvedValue();

      const result = await acceptInvite(mockDb, 'ABC12DEF', mockUser);
      
      expect(result.success).toBe(true);
      expect(result.orgId).toBe('org123');
      expect(result.orgName).toBe('Test Org');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should return error for expired invite', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          expiresAt: { toDate: () => pastDate },
          maxUses: 0,
          uses: 0,
        }),
      });

      const result = await acceptInvite(mockDb, 'ABC12DEF', mockUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('This invite has expired');
    });

    it('should return error for exhausted invite', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          code: 'ABC12DEF',
          maxUses: 1,
          uses: 1,
        }),
      });

      const result = await acceptInvite(mockDb, 'ABC12DEF', mockUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('This invite has reached its maximum uses');
    });
  });
});
