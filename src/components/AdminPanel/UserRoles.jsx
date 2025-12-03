/**
 * UserRoles - User and role management
 * 
 * Allows admins to view members, change roles, and remove users.
 */

import { useState } from 'react';
import { 
  Users, 
  Crown, 
  Shield, 
  User, 
  MoreVertical,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { 
  ROLE_LABELS, 
  canManageRole, 
  getAssignableRoles, 
  isOnlyOwner,
  validateRoleChange 
} from '../../lib/roleService';

/**
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Object} props.organization - Organization data
 * @param {string} props.userRole - Current user's role
 * @param {boolean} props.isOwner - Whether current user is owner
 * @param {Function} props.updateMemberRole - Update a member's role
 * @param {Function} props.removeMember - Remove a member
 * @param {string} props.currentUserId - Current user's ID
 */
export default function UserRoles({
  darkMode,
  organization,
  userRole,
  isOwner,
  updateMemberRole,
  removeMember,
  currentUserId,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [changingRole, setChangingRole] = useState(null);

  const members = organization?.members || {};
  const memberList = Object.entries(members).map(([id, data]) => ({
    id,
    ...data,
  }));

  // Sort: owner first, then admins, then members
  memberList.sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-indigo-500" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    const member = members[memberId];
    const validation = validateRoleChange({
      actorRole: userRole,
      currentRole: member.role,
      newRole,
      isOnlyOwner: isOnlyOwner(members, memberId),
    });

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setChangingRole(memberId);
    try {
      await updateMemberRole(memberId, newRole);
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('Failed to change role');
    } finally {
      setChangingRole(null);
      setOpenMenu(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const member = members[memberId];
    
    if (member.role === 'owner') {
      alert('Cannot remove the owner');
      return;
    }

    if (!confirm(`Remove ${member.email} from the organization?`)) {
      return;
    }

    try {
      await removeMember(memberId);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
    setOpenMenu(null);
  };

  const cardClass = `rounded-lg border ${
    darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
  }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {memberList.length} member{memberList.length !== 1 ? 's' : ''} in this organization
        </p>
        {/* Future: Add invite button here */}
      </div>

      <div className={cardClass}>
        <div className="divide-y divide-slate-200 dark:divide-slate-600">
          {memberList.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const canManage = canManageRole(userRole, member.role) && !isCurrentUser;
            const assignableRoles = getAssignableRoles(userRole);
            const isMenuOpen = openMenu === member.id;

            return (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                } transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-slate-600' : 'bg-slate-200'
                  }`}>
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {member.displayName || member.email}
                      </span>
                      {isCurrentUser && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                        }`}>
                          You
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role badge or dropdown */}
                  {canManage && assignableRoles.length > 0 ? (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(isMenuOpen ? null : member.id)}
                        disabled={changingRole === member.id}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          darkMode
                            ? 'border-slate-600 text-slate-300 hover:bg-slate-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {changingRole === member.id ? (
                          'Changing...'
                        ) : (
                          <>
                            {ROLE_LABELS[member.role]}
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      
                      {isMenuOpen && (
                        <div className={`absolute right-0 mt-1 w-40 rounded-lg shadow-lg border z-10 ${
                          darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
                        }`}>
                          {assignableRoles.map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(member.id, role)}
                              disabled={role === member.role}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                role === member.role
                                  ? darkMode
                                    ? 'text-slate-500 cursor-not-allowed'
                                    : 'text-slate-400 cursor-not-allowed'
                                  : darkMode
                                    ? 'text-slate-200 hover:bg-slate-600'
                                    : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {ROLE_LABELS[role]}
                              {role === member.role && ' (current)'}
                            </button>
                          ))}
                          <div className={`border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} />
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className={`w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`px-3 py-1.5 text-sm rounded-lg ${
                      member.role === 'owner'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : member.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : darkMode
                            ? 'bg-slate-600 text-slate-300'
                            : 'bg-slate-200 text-slate-600'
                    }`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role descriptions */}
      <div className={`text-xs space-y-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <p><strong>Owner:</strong> Full access, can delete organization and transfer ownership</p>
        <p><strong>Admin:</strong> Manage API keys, users, and settings</p>
        <p><strong>Member:</strong> Use organization API keys and features</p>
      </div>
    </div>
  );
}
