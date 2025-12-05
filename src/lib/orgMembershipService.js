/**
 * Organization Membership Service
 * 
 * Tracks which organizations a user belongs to and manages invites.
 * 
 * @module lib/orgMembershipService
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

/**
 * Generate a random invite code
 * @returns {string} 8-character invite code
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I, L)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get all organizations a user belongs to
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of orgs with id, name, role
 */
export async function getUserOrganizations(db, userId) {
  if (!db || !userId) return [];

  try {
    // Get user's membership list
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    const memberships = userSnap.exists() 
      ? (userSnap.data().organizations || [])
      : [];

    // Always include personal org
    const personalOrgId = `org_${userId}`;
    const orgs = [{
      id: personalOrgId,
      name: 'Personal',
      role: 'owner',
      isPersonal: true,
    }];

    // Fetch details for each org membership
    for (const orgId of memberships) {
      if (orgId === personalOrgId) continue; // Skip personal org
      
      try {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        
        if (orgSnap.exists()) {
          const orgData = orgSnap.data();
          const userRole = orgData.members?.[userId]?.role || 'member';
          
          orgs.push({
            id: orgId,
            name: orgData.name || 'Unnamed Org',
            role: userRole,
            isPersonal: false,
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch org ${orgId}:`, err);
      }
    }

    return orgs;
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return [{
      id: `org_${userId}`,
      name: 'Personal',
      role: 'owner',
      isPersonal: true,
    }];
  }
}

/**
 * Add user to an organization's membership list
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 */
export async function addUserToOrgMembership(db, userId, orgId) {
  if (!db || !userId || !orgId) return;

  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      organizations: arrayUnion(orgId),
    });
  } catch (error) {
    // Document might not exist, create it
    if (error.code === 'not-found') {
      await setDoc(userRef, {
        organizations: [orgId],
      }, { merge: true });
    } else {
      throw error;
    }
  }
}

/**
 * Remove user from an organization's membership list
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 */
export async function removeUserFromOrgMembership(db, userId, orgId) {
  if (!db || !userId || !orgId) return;

  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      organizations: arrayRemove(orgId),
    });
  } catch (error) {
    console.error('Error removing org membership:', error);
  }
}

/**
 * Create a new organization
 * 
 * @param {Object} db - Firestore instance
 * @param {string} name - Organization name
 * @param {Object} creator - Creator user object { uid, email, displayName }
 * @returns {Promise<string>} New organization ID
 */
export async function createOrganization(db, name, creator) {
  if (!db || !name || !creator?.uid) {
    throw new Error('Missing required parameters');
  }

  // Generate unique org ID
  const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const orgRef = doc(db, 'organizations', orgId);

  const orgData = {
    name,
    createdAt: serverTimestamp(),
    createdBy: creator.uid,
    members: {
      [creator.uid]: {
        role: 'owner',
        email: creator.email || '',
        displayName: creator.displayName || '',
        joinedAt: serverTimestamp(),
      },
    },
    apiKeys: {},
    settings: {
      allowUserKeys: true,
      requireOrgKeys: false,
      isConfigured: true, // Mark as real org
    },
  };

  await setDoc(orgRef, orgData);
  
  // Add to creator's membership list
  await addUserToOrgMembership(db, creator.uid, orgId);

  return orgId;
}

/**
 * Create an invite for an organization
 * 
 * @param {Object} db - Firestore instance
 * @param {string} orgId - Organization ID
 * @param {string} createdBy - User ID who created the invite
 * @param {string} role - Role to assign ('member' or 'admin')
 * @param {number} maxUses - Maximum number of uses (0 = unlimited)
 * @param {number} expiresInDays - Days until expiration (0 = never)
 * @returns {Promise<Object>} Invite object with code
 */
export async function createInvite(db, orgId, createdBy, role = 'member', maxUses = 0, expiresInDays = 7) {
  if (!db || !orgId || !createdBy) {
    throw new Error('Missing required parameters');
  }

  const code = generateInviteCode();
  const inviteRef = doc(db, 'invites', code);

  const expiresAt = expiresInDays > 0 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const inviteData = {
    code,
    orgId,
    role,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt,
    maxUses,
    uses: 0,
    usedBy: [],
  };

  await setDoc(inviteRef, inviteData);

  return { code, ...inviteData };
}

/**
 * Get invite details by code
 * 
 * @param {Object} db - Firestore instance
 * @param {string} code - Invite code
 * @returns {Promise<Object|null>} Invite data or null
 */
export async function getInvite(db, code) {
  if (!db || !code) return null;

  try {
    const inviteRef = doc(db, 'invites', code.toUpperCase());
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) return null;

    const invite = inviteSnap.data();
    
    // Check if expired
    if (invite.expiresAt && new Date(invite.expiresAt.toDate()) < new Date()) {
      return { ...invite, expired: true };
    }

    // Check if max uses reached
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return { ...invite, exhausted: true };
    }

    return invite;
  } catch (error) {
    console.error('Error fetching invite:', error);
    return null;
  }
}

/**
 * Accept an invite and join an organization
 * 
 * @param {Object} db - Firestore instance
 * @param {string} code - Invite code
 * @param {Object} user - User object { uid, email, displayName }
 * @returns {Promise<Object>} Result { success, orgId, orgName, error }
 */
export async function acceptInvite(db, code, user) {
  if (!db || !code || !user?.uid) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const invite = await getInvite(db, code);

    if (!invite) {
      return { success: false, error: 'Invalid invite code' };
    }

    if (invite.expired) {
      return { success: false, error: 'This invite has expired' };
    }

    if (invite.exhausted) {
      return { success: false, error: 'This invite has reached its maximum uses' };
    }

    // Check if user already used this invite
    if (invite.usedBy?.includes(user.uid)) {
      return { success: false, error: 'You have already used this invite' };
    }

    // Get org details
    const orgRef = doc(db, 'organizations', invite.orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      return { success: false, error: 'Organization no longer exists' };
    }

    const orgData = orgSnap.data();

    // Check if already a member
    if (orgData.members?.[user.uid]) {
      return { success: false, error: 'You are already a member of this organization' };
    }

    // Add user to organization
    await updateDoc(orgRef, {
      [`members.${user.uid}`]: {
        role: invite.role,
        email: user.email || '',
        displayName: user.displayName || '',
        joinedAt: serverTimestamp(),
        invitedBy: invite.createdBy,
      },
    });

    // Update invite usage
    const inviteRef = doc(db, 'invites', code.toUpperCase());
    await updateDoc(inviteRef, {
      uses: invite.uses + 1,
      usedBy: arrayUnion(user.uid),
    });

    // Add to user's membership list
    await addUserToOrgMembership(db, user.uid, invite.orgId);

    return { 
      success: true, 
      orgId: invite.orgId, 
      orgName: orgData.name,
    };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return { success: false, error: 'Failed to join organization' };
  }
}

/**
 * Get all active invites for an organization
 * 
 * @param {Object} db - Firestore instance
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} List of invites
 */
export async function getOrgInvites(db, orgId) {
  if (!db || !orgId) return [];

  try {
    const invitesRef = collection(db, 'invites');
    const q = query(invitesRef, where('orgId', '==', orgId));
    const snapshot = await getDocs(q);

    const invites = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isExpired = data.expiresAt && new Date(data.expiresAt.toDate()) < new Date();
      const isExhausted = data.maxUses > 0 && data.uses >= data.maxUses;
      
      invites.push({
        ...data,
        id: doc.id,
        expired: isExpired,
        exhausted: isExhausted,
        active: !isExpired && !isExhausted,
      });
    });

    return invites;
  } catch (error) {
    console.error('Error fetching org invites:', error);
    return [];
  }
}

/**
 * Delete an invite
 * 
 * @param {Object} db - Firestore instance
 * @param {string} code - Invite code
 */
export async function deleteInvite(db, code) {
  if (!db || !code) return;

  try {
    const inviteRef = doc(db, 'invites', code.toUpperCase());
    await deleteDoc(inviteRef);
  } catch (error) {
    console.error('Error deleting invite:', error);
  }
}
