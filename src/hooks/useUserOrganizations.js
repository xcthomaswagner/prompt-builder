/**
 * useUserOrganizations - Hook for managing user's organization memberships
 * 
 * Tracks all orgs a user belongs to and handles org switching.
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserOrganizations, createOrganization, acceptInvite } from '../lib/orgMembershipService';

/**
 * Hook for managing user's organizations
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} user - Current user
 * @returns {Object} Organizations state and actions
 */
export default function useUserOrganizations(db, user) {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's organizations
  useEffect(() => {
    if (!db || !user?.uid) {
      setOrganizations([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    const loadOrgs = async () => {
      setLoading(true);
      try {
        const orgs = await getUserOrganizations(db, user.uid);
        setOrganizations(orgs);
        
        // Set current org from localStorage or default to personal
        const savedOrgId = localStorage.getItem('currentOrgId');
        const validOrg = orgs.find(o => o.id === savedOrgId);
        
        if (validOrg) {
          setCurrentOrgId(savedOrgId);
        } else {
          // Default to personal org
          const personalOrg = orgs.find(o => o.isPersonal);
          setCurrentOrgId(personalOrg?.id || `org_${user.uid}`);
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
        // Fallback to personal org
        setOrganizations([{
          id: `org_${user.uid}`,
          name: 'Personal',
          role: 'owner',
          isPersonal: true,
        }]);
        setCurrentOrgId(`org_${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    loadOrgs();
  }, [db, user?.uid]);

  // Switch to a different org
  const switchOrg = useCallback((orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrgId(orgId);
      localStorage.setItem('currentOrgId', orgId);
    }
  }, [organizations]);

  // Create a new organization
  const createNewOrg = useCallback(async (name) => {
    if (!db || !user) {
      throw new Error('Not authenticated');
    }

    const orgId = await createOrganization(db, name, user);
    
    // Refresh org list
    const orgs = await getUserOrganizations(db, user.uid);
    setOrganizations(orgs);
    
    // Switch to new org
    setCurrentOrgId(orgId);
    localStorage.setItem('currentOrgId', orgId);

    return orgId;
  }, [db, user]);

  // Join an org via invite code
  const joinOrg = useCallback(async (inviteCode) => {
    if (!db || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await acceptInvite(db, inviteCode, user);
    
    if (result.success) {
      // Refresh org list
      const orgs = await getUserOrganizations(db, user.uid);
      setOrganizations(orgs);
      
      // Switch to joined org
      setCurrentOrgId(result.orgId);
      localStorage.setItem('currentOrgId', result.orgId);
    }

    return result;
  }, [db, user]);

  // Refresh organizations list
  const refreshOrgs = useCallback(async () => {
    if (!db || !user?.uid) return;
    
    const orgs = await getUserOrganizations(db, user.uid);
    setOrganizations(orgs);
  }, [db, user?.uid]);

  // Get current org details
  const currentOrg = organizations.find(o => o.id === currentOrgId) 
    || organizations.find(o => o.isPersonal);

  return {
    organizations,
    currentOrgId,
    currentOrg,
    loading,
    switchOrg,
    createNewOrg,
    joinOrg,
    refreshOrgs,
  };
}
