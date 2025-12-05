/**
 * Tests for useUserOrganizations hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useUserOrganizations from './useUserOrganizations';

// Mock the orgMembershipService
vi.mock('../lib/orgMembershipService', () => ({
  getUserOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  acceptInvite: vi.fn(),
}));

import { getUserOrganizations, createOrganization, acceptInvite } from '../lib/orgMembershipService';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useUserOrganizations', () => {
  const mockDb = { _db: true };
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockOrgs = [
    { id: 'org_user123', name: 'Personal', role: 'owner', isPersonal: true },
    { id: 'org_team1', name: 'Team Alpha', role: 'admin', isPersonal: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    getUserOrganizations.mockResolvedValue(mockOrgs);
  });

  describe('initialization', () => {
    it('should load organizations on mount', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getUserOrganizations).toHaveBeenCalledWith(mockDb, 'user123');
      expect(result.current.organizations).toEqual(mockOrgs);
    });

    it('should default to personal org', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentOrgId).toBe('org_user123');
    });

    it('should restore saved org from localStorage', async () => {
      localStorageMock.setItem('currentOrgId', 'org_team1');

      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentOrgId).toBe('org_team1');
    });

    it('should fallback to personal if saved org not found', async () => {
      localStorageMock.setItem('currentOrgId', 'org_nonexistent');

      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentOrgId).toBe('org_user123');
    });

    it('should return empty state if no db', async () => {
      const { result } = renderHook(() => useUserOrganizations(null, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.organizations).toEqual([]);
      expect(result.current.currentOrgId).toBeNull();
    });

    it('should return empty state if no user', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.organizations).toEqual([]);
    });
  });

  describe('switchOrg', () => {
    it('should switch to a valid org', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.switchOrg('org_team1');
      });

      expect(result.current.currentOrgId).toBe('org_team1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('currentOrgId', 'org_team1');
    });

    it('should not switch to invalid org', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialOrgId = result.current.currentOrgId;

      act(() => {
        result.current.switchOrg('org_nonexistent');
      });

      expect(result.current.currentOrgId).toBe(initialOrgId);
    });
  });

  describe('createNewOrg', () => {
    it('should create org and switch to it', async () => {
      createOrganization.mockResolvedValue('org_new123');
      getUserOrganizations.mockResolvedValueOnce(mockOrgs);
      getUserOrganizations.mockResolvedValueOnce([
        ...mockOrgs,
        { id: 'org_new123', name: 'New Org', role: 'owner', isPersonal: false },
      ]);

      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let newOrgId;
      await act(async () => {
        newOrgId = await result.current.createNewOrg('New Org');
      });

      expect(createOrganization).toHaveBeenCalledWith(mockDb, 'New Org', mockUser);
      expect(newOrgId).toBe('org_new123');
      expect(result.current.currentOrgId).toBe('org_new123');
    });

    it('should throw if not authenticated', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.createNewOrg('Test')).rejects.toThrow('Not authenticated');
    });
  });

  describe('joinOrg', () => {
    it('should join org and switch to it', async () => {
      acceptInvite.mockResolvedValue({
        success: true,
        orgId: 'org_joined',
        orgName: 'Joined Org',
      });
      getUserOrganizations.mockResolvedValueOnce(mockOrgs);
      getUserOrganizations.mockResolvedValueOnce([
        ...mockOrgs,
        { id: 'org_joined', name: 'Joined Org', role: 'member', isPersonal: false },
      ]);

      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinOrg('ABC12DEF');
      });

      expect(acceptInvite).toHaveBeenCalledWith(mockDb, 'ABC12DEF', mockUser);
      expect(joinResult.success).toBe(true);
      expect(result.current.currentOrgId).toBe('org_joined');
    });

    it('should return error for invalid invite', async () => {
      acceptInvite.mockResolvedValue({
        success: false,
        error: 'Invalid invite code',
      });

      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinOrg('INVALID1');
      });

      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBe('Invalid invite code');
    });

    it('should return error if not authenticated', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinOrg('ABC12DEF');
      });

      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBe('Not authenticated');
    });
  });

  describe('currentOrg', () => {
    it('should return current org object', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentOrg).toEqual(mockOrgs[0]);

      act(() => {
        result.current.switchOrg('org_team1');
      });

      expect(result.current.currentOrg).toEqual(mockOrgs[1]);
    });
  });

  describe('refreshOrgs', () => {
    it('should refresh organizations list', async () => {
      const { result } = renderHook(() => useUserOrganizations(mockDb, mockUser));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedOrgs = [
        ...mockOrgs,
        { id: 'org_new', name: 'New Org', role: 'member', isPersonal: false },
      ];
      getUserOrganizations.mockResolvedValueOnce(updatedOrgs);

      await act(async () => {
        await result.current.refreshOrgs();
      });

      expect(result.current.organizations).toEqual(updatedOrgs);
    });
  });
});
