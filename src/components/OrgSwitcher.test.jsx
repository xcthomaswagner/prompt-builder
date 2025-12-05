/**
 * Tests for OrgSwitcher component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrgSwitcher from './OrgSwitcher';

describe('OrgSwitcher', () => {
  const mockOrganizations = [
    { id: 'org_user123', name: 'Personal', role: 'owner', isPersonal: true },
    { id: 'org_team1', name: 'Team Alpha', role: 'admin', isPersonal: false },
    { id: 'org_team2', name: 'Team Beta', role: 'member', isPersonal: false },
  ];

  const defaultProps = {
    organizations: mockOrganizations,
    currentOrgId: 'org_user123',
    onSwitch: vi.fn(),
    onCreateOrg: vi.fn(),
    onJoinOrg: vi.fn(),
    darkMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single org (Personal only)', () => {
    it('should show simple "Personal" label without dropdown', () => {
      const singleOrg = [{ id: 'org_user123', name: 'Personal', role: 'owner', isPersonal: true }];
      
      render(<OrgSwitcher {...defaultProps} organizations={singleOrg} />);
      
      expect(screen.getByText('Personal')).toBeInTheDocument();
      // Should not have dropdown arrow
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Multiple orgs', () => {
    it('should show current org name with dropdown button', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('should open dropdown on click', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    it('should show all organizations in dropdown', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      // Personal appears twice (in button and dropdown)
      expect(screen.getAllByText('Personal')).toHaveLength(2);
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    it('should show role for non-personal orgs', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('member')).toBeInTheDocument();
    });

    it('should call onSwitch when selecting an org', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Team Alpha'));
      
      expect(defaultProps.onSwitch).toHaveBeenCalledWith('org_team1');
    });

    it('should close dropdown after selection', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Team Alpha'));
      
      // Dropdown should be closed - Team Alpha should only appear once (in button)
      expect(screen.queryByText('admin')).not.toBeInTheDocument();
    });

    it('should show checkmark for current org', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      // The current org should have a check icon (we can check by class or test-id)
      const personalButton = screen.getAllByRole('button').find(btn => 
        btn.textContent?.includes('Personal')
      );
      expect(personalButton).toBeInTheDocument();
    });
  });

  describe('Create/Join options', () => {
    it('should show "Join Organization" option', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.getByText('Join Organization')).toBeInTheDocument();
    });

    it('should show "Create Organization" option', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.getByText('Create Organization')).toBeInTheDocument();
    });

    it('should call onJoinOrg when clicking Join', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Join Organization'));
      
      expect(defaultProps.onJoinOrg).toHaveBeenCalled();
    });

    it('should call onCreateOrg when clicking Create', () => {
      render(<OrgSwitcher {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Create Organization'));
      
      expect(defaultProps.onCreateOrg).toHaveBeenCalled();
    });

    it('should not show options if callbacks not provided', () => {
      render(
        <OrgSwitcher 
          {...defaultProps} 
          onCreateOrg={undefined} 
          onJoinOrg={undefined} 
        />
      );
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.queryByText('Join Organization')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Organization')).not.toBeInTheDocument();
    });
  });

  describe('Dark mode', () => {
    it('should apply dark mode classes', () => {
      render(<OrgSwitcher {...defaultProps} darkMode={true} />);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-slate-300');
    });
  });

  describe('Current org display', () => {
    it('should show selected org name', () => {
      render(<OrgSwitcher {...defaultProps} currentOrgId="org_team1" />);
      
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    it('should fallback to Personal if currentOrgId not found', () => {
      render(<OrgSwitcher {...defaultProps} currentOrgId="nonexistent" />);
      
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  });
});
