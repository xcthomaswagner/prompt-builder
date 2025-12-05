/**
 * OrgSwitcher - Dropdown to switch between organizations
 * 
 * Shows "Personal" if user only has their personal org.
 * Shows dropdown with all orgs if user belongs to multiple.
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, User, Plus, Check, UserPlus } from 'lucide-react';

export default function OrgSwitcher({ 
  organizations = [], 
  currentOrgId, 
  onSwitch, 
  onCreateOrg,
  onJoinOrg,
  darkMode = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find current org
  const currentOrg = organizations.find(org => org.id === currentOrgId) 
    || organizations.find(org => org.isPersonal)
    || { name: 'Personal', isPersonal: true };

  // If only personal org, show simple label (no dropdown)
  const hasMultipleOrgs = organizations.length > 1;

  if (!hasMultipleOrgs) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
        darkMode ? 'text-slate-400' : 'text-slate-600'
      }`}>
        <User className="w-4 h-4" />
        <span>Personal</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          darkMode 
            ? 'hover:bg-slate-700 text-slate-300' 
            : 'hover:bg-slate-100 text-slate-700'
        }`}
      >
        {currentOrg.isPersonal ? (
          <User className="w-4 h-4" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
        <span className="max-w-[150px] truncate">{currentOrg.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg border z-50 py-1 ${
          darkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Org list */}
          <div className="max-h-64 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onSwitch(org.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  org.id === currentOrgId
                    ? darkMode 
                      ? 'bg-slate-700 text-white' 
                      : 'bg-indigo-50 text-indigo-700'
                    : darkMode
                      ? 'hover:bg-slate-700 text-slate-300'
                      : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {org.isPersonal ? (
                  <User className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{org.name}</div>
                  {!org.isPersonal && (
                    <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {org.role}
                    </div>
                  )}
                </div>
                {org.id === currentOrgId && (
                  <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Create/Join org options */}
          {(onCreateOrg || onJoinOrg) && (
            <>
              <div className={`border-t my-1 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />
              {onJoinOrg && (
                <button
                  onClick={() => {
                    onJoinOrg();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                      : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Join Organization</span>
                </button>
              )}
              {onCreateOrg && (
                <button
                  onClick={() => {
                    onCreateOrg();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                      : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Organization</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
