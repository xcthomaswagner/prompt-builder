/**
 * Role Service - RBAC for organization management
 * 
 * Defines roles, permissions, and helper functions for access control.
 * 
 * @module lib/roleService
 */

/**
 * @typedef {'owner' | 'admin' | 'member'} Role
 */

/**
 * @typedef {Object} OrgMember
 * @property {Role} role - User's role in the organization
 * @property {string} email - User's email
 * @property {string} [displayName] - User's display name
 * @property {Date} joinedAt - When user joined
 * @property {string|null} invitedBy - User ID who invited them
 */

/**
 * @typedef {Object} OrgSettings
 * @property {boolean} allowUserKeys - Allow members to use personal API keys
 * @property {boolean} requireOrgKeys - Enterprise mode: force org keys only
 * @property {string} defaultProvider - Default LLM provider
 * @property {Object} usageAlerts - Alert configuration
 * @property {boolean} usageAlerts.enabled - Whether alerts are enabled
 * @property {number} usageAlerts.warnThreshold - Warn at this % remaining
 * @property {number} usageAlerts.criticalThreshold - Critical at this % remaining
 */

/**
 * Role hierarchy (higher index = more permissions)
 */
export const ROLES = {
  member: 0,
  admin: 1,
  owner: 2,
};

/**
 * Role display labels
 */
export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

/**
 * Default organization settings
 */
export const DEFAULT_ORG_SETTINGS = {
  allowUserKeys: true,
  requireOrgKeys: false,
  defaultProvider: 'gemini',
  usageAlerts: {
    enabled: true,
    warnThreshold: 0.20,
    criticalThreshold: 0.10,
  },
};

/**
 * Permission definitions
 */
const PERMISSIONS = {
  // API Key management
  VIEW_ORG_API_KEYS: ['owner', 'admin'],
  EDIT_ORG_API_KEYS: ['owner', 'admin'],
  MANAGE_PERSONAL_KEYS: ['owner', 'admin', 'member'],
  
  // Usage & Analytics
  VIEW_ORG_USAGE: ['owner', 'admin'],
  VIEW_USER_USAGE: ['owner', 'admin'],
  EXPORT_USAGE: ['owner', 'admin'],
  
  // User management
  VIEW_USERS: ['owner', 'admin'],
  INVITE_USERS: ['owner', 'admin'],
  MANAGE_ROLES: ['owner', 'admin'],
  REMOVE_USERS: ['owner', 'admin'],
  
  // Organization settings
  VIEW_ORG_SETTINGS: ['owner', 'admin'],
  EDIT_ORG_SETTINGS: ['owner', 'admin'],
  DELETE_ORGANIZATION: ['owner'],
  TRANSFER_OWNERSHIP: ['owner'],
  
  // General access
  USE_ORG_API_KEYS: ['owner', 'admin', 'member'],
  ACCESS_ADMIN_PANEL: ['owner', 'admin'],
};

/**
 * Check if a role has a specific permission
 * 
 * @param {Role} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether the role has the permission
 */
export function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Check if a role can manage another role
 * (Admins cannot manage owners, members cannot manage anyone)
 * 
 * @param {Role} actorRole - Role of the user performing the action
 * @param {Role} targetRole - Role of the user being managed
 * @returns {boolean} Whether the actor can manage the target
 */
export function canManageRole(actorRole, targetRole) {
  // Only owner and admin can manage roles
  if (!hasPermission(actorRole, 'MANAGE_ROLES')) {
    return false;
  }
  
  // Owners can manage anyone
  if (actorRole === 'owner') {
    return true;
  }
  
  // Admins can only manage members (not other admins or owners)
  if (actorRole === 'admin') {
    return targetRole === 'member';
  }
  
  return false;
}

/**
 * Get available roles that an actor can assign
 * 
 * @param {Role} actorRole - Role of the user performing the action
 * @returns {Role[]} Array of roles the actor can assign
 */
export function getAssignableRoles(actorRole) {
  if (actorRole === 'owner') {
    return ['admin', 'member'];
  }
  if (actorRole === 'admin') {
    return ['member'];
  }
  return [];
}

/**
 * Check if user is the only owner in the organization
 * 
 * @param {Object} members - Organization members object
 * @param {string} userId - User ID to check
 * @returns {boolean} Whether the user is the only owner
 */
export function isOnlyOwner(members, userId) {
  const owners = Object.entries(members).filter(
    ([_, member]) => member.role === 'owner'
  );
  return owners.length === 1 && owners[0][0] === userId;
}

/**
 * Get user's role in an organization
 * 
 * @param {Object} members - Organization members object
 * @param {string} userId - User ID to look up
 * @returns {Role|null} User's role or null if not a member
 */
export function getUserRole(members, userId) {
  const member = members?.[userId];
  return member?.role || null;
}

/**
 * Check if user is an admin or owner
 * 
 * @param {Object} members - Organization members object
 * @param {string} userId - User ID to check
 * @returns {boolean} Whether user is admin or owner
 */
export function isOrgAdmin(members, userId) {
  const role = getUserRole(members, userId);
  return role === 'owner' || role === 'admin';
}

/**
 * Check if user is the owner
 * 
 * @param {Object} members - Organization members object
 * @param {string} userId - User ID to check
 * @returns {boolean} Whether user is the owner
 */
export function isOrgOwner(members, userId) {
  return getUserRole(members, userId) === 'owner';
}

/**
 * Create a new member object
 * 
 * @param {Object} params - Member parameters
 * @param {Role} params.role - User's role
 * @param {string} params.email - User's email
 * @param {string} [params.displayName] - User's display name
 * @param {string|null} [params.invitedBy] - User ID who invited them
 * @returns {OrgMember} New member object
 */
export function createMember({ role, email, displayName = '', invitedBy = null }) {
  return {
    role,
    email,
    displayName,
    joinedAt: new Date(),
    invitedBy,
  };
}

/**
 * Create default organization structure for a new org
 * 
 * @param {string} name - Organization name
 * @param {string} ownerId - User ID of the owner
 * @param {string} ownerEmail - Email of the owner
 * @param {string} [ownerDisplayName] - Display name of the owner
 * @returns {Object} New organization object
 */
export function createOrganization(name, ownerId, ownerEmail, ownerDisplayName = '') {
  return {
    name,
    createdAt: new Date(),
    createdBy: ownerId,
    members: {
      [ownerId]: createMember({
        role: 'owner',
        email: ownerEmail,
        displayName: ownerDisplayName,
        invitedBy: null,
      }),
    },
    settings: { ...DEFAULT_ORG_SETTINGS },
    apiKeys: {},
  };
}

/**
 * Validate role change
 * 
 * @param {Object} params - Validation parameters
 * @param {Role} params.actorRole - Role of user making the change
 * @param {Role} params.currentRole - Current role of target user
 * @param {Role} params.newRole - Proposed new role
 * @param {boolean} params.isOnlyOwner - Whether target is the only owner
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateRoleChange({ actorRole, currentRole, newRole, isOnlyOwner }) {
  // Cannot change to same role
  if (currentRole === newRole) {
    return { valid: false, error: 'Role is already set' };
  }
  
  // Cannot demote the only owner
  if (currentRole === 'owner' && isOnlyOwner) {
    return { valid: false, error: 'Cannot demote the only owner' };
  }
  
  // Check if actor can manage the target's current role
  if (!canManageRole(actorRole, currentRole)) {
    return { valid: false, error: 'You do not have permission to manage this user' };
  }
  
  // Check if actor can assign the new role
  const assignableRoles = getAssignableRoles(actorRole);
  if (!assignableRoles.includes(newRole)) {
    return { valid: false, error: `You cannot assign the ${newRole} role` };
  }
  
  return { valid: true };
}
