/**
 * useOrganization - Custom hook for organization data management
 * 
 * Handles fetching, updating, and managing organization data including
 * members, settings, and API keys.
 * 
 * @module hooks/useOrganization
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getUserRole, 
  isOrgAdmin, 
  createOrganization, 
  createMember,
  DEFAULT_ORG_SETTINGS 
} from '../lib/roleService';

/**
 * @typedef {Object} UseOrganizationReturn
 * @property {Object|null} organization - Organization data
 * @property {string|null} userRole - Current user's role
 * @property {boolean} isAdmin - Whether user is admin or owner
 * @property {boolean} isOwner - Whether user is owner
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message
 * @property {Function} updateSettings - Update org settings
 * @property {Function} updateApiKey - Update an API key
 * @property {Function} removeApiKey - Remove an API key
 * @property {Function} updateMemberRole - Update a member's role
 * @property {Function} removeMember - Remove a member
 * @property {Function} createOrg - Create a new organization
 */

/**
 * Hook for managing organization data
 * 
 * @param {Object} db - Firestore database instance
 * @param {Object} user - Current authenticated user
 * @param {string} [orgId] - Organization ID (defaults to user's default org)
 * @returns {UseOrganizationReturn}
 */
export default function useOrganization(db, user, orgId = null) {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine the org ID to use
  const effectiveOrgId = orgId || (user ? `org_${user.uid}` : null);

  // Subscribe to organization data
  useEffect(() => {
    if (!db || !effectiveOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    
    const unsubscribe = onSnapshot(
      orgRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setOrganization({ id: docSnap.id, ...docSnap.data() });
        } else {
          setOrganization(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, effectiveOrgId]);

  // Computed values
  const userRole = organization?.members && user 
    ? getUserRole(organization.members, user.uid) 
    : null;
  
  // Check if this is a "real" org (has multiple members or org-level API keys)
  const memberCount = organization?.members ? Object.keys(organization.members).length : 0;
  const hasOrgKeys = organization?.apiKeys && Object.keys(organization.apiKeys).length > 0;
  const isRealOrg = memberCount > 1 || hasOrgKeys || organization?.settings?.isConfigured;
  
  // Only show admin privileges for real orgs, not auto-created personal orgs
  const isAdmin = organization?.members && user && isRealOrg
    ? isOrgAdmin(organization.members, user.uid) 
    : false;
  
  const isOwner = userRole === 'owner';

  /**
   * Create a new organization for the user
   */
  const createOrg = useCallback(async (name = 'My Organization') => {
    if (!db || !user) {
      throw new Error('Database or user not available');
    }

    const newOrgId = `org_${user.uid}`;
    const orgRef = doc(db, 'organizations', newOrgId);
    
    const orgData = createOrganization(
      name,
      user.uid,
      user.email || '',
      user.displayName || ''
    );

    // Convert Date to Firestore timestamp
    orgData.createdAt = serverTimestamp();
    orgData.members[user.uid].joinedAt = serverTimestamp();

    await setDoc(orgRef, orgData);
    return newOrgId;
  }, [db, user]);

  /**
   * Update organization settings
   */
  const updateSettings = useCallback(async (newSettings) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to update settings');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    await updateDoc(orgRef, {
      settings: {
        ...DEFAULT_ORG_SETTINGS,
        ...organization?.settings,
        ...newSettings,
      },
    });
  }, [db, effectiveOrgId, isAdmin, organization?.settings]);

  /**
   * Update an API key
   */
  const updateApiKey = useCallback(async (provider, keyData) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to update API keys');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    await updateDoc(orgRef, {
      [`apiKeys.${provider}`]: {
        ...keyData,
        addedAt: serverTimestamp(),
        addedBy: user?.uid,
      },
    });
  }, [db, effectiveOrgId, isAdmin, user?.uid]);

  /**
   * Remove an API key
   */
  const removeApiKey = useCallback(async (provider) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to remove API keys');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    const currentKeys = organization?.apiKeys || {};
    const { [provider]: removed, ...remainingKeys } = currentKeys;
    
    await updateDoc(orgRef, {
      apiKeys: remainingKeys,
    });
  }, [db, effectiveOrgId, isAdmin, organization?.apiKeys]);

  /**
   * Update a member's role
   */
  const updateMemberRole = useCallback(async (memberId, newRole) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to update member roles');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    await updateDoc(orgRef, {
      [`members.${memberId}.role`]: newRole,
    });
  }, [db, effectiveOrgId, isAdmin]);

  /**
   * Remove a member from the organization
   */
  const removeMember = useCallback(async (memberId) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to remove members');
    }

    // Cannot remove yourself if you're the owner
    if (memberId === user?.uid && isOwner) {
      throw new Error('Cannot remove yourself as owner');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    const currentMembers = organization?.members || {};
    const { [memberId]: removed, ...remainingMembers } = currentMembers;
    
    await updateDoc(orgRef, {
      members: remainingMembers,
    });
  }, [db, effectiveOrgId, isAdmin, isOwner, user?.uid, organization?.members]);

  /**
   * Add a new member to the organization
   */
  const addMember = useCallback(async (memberId, email, role = 'member', displayName = '') => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to add members');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    const memberData = createMember({
      role,
      email,
      displayName,
      invitedBy: user?.uid,
    });

    // Convert Date to Firestore timestamp
    memberData.joinedAt = serverTimestamp();

    await updateDoc(orgRef, {
      [`members.${memberId}`]: memberData,
    });
  }, [db, effectiveOrgId, isAdmin, user?.uid]);

  /**
   * Update organization name
   */
  const updateOrgName = useCallback(async (newName) => {
    if (!db || !effectiveOrgId || !isAdmin) {
      throw new Error('Not authorized to update organization name');
    }

    const orgRef = doc(db, 'organizations', effectiveOrgId);
    await updateDoc(orgRef, { name: newName });
  }, [db, effectiveOrgId, isAdmin]);

  return {
    organization,
    userRole,
    isAdmin,
    isOwner,
    isRealOrg,
    loading,
    error,
    createOrg,
    updateSettings,
    updateApiKey,
    removeApiKey,
    updateMemberRole,
    removeMember,
    addMember,
    updateOrgName,
  };
}
