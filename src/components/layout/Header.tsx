// Header component with user info and actions
import React, { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showUserInfo?: boolean;
  showLogout?: boolean;
  onBackClick?: () => void;
  backButtonText?: string;
  children?: ReactNode;
}

export function Header({
  title,
  subtitle,
  showUserInfo = false,
  showLogout = false,
  onBackClick,
  backButtonText = 'Back',
  children,
}: HeaderProps) {
  const { user, logout } = useAuth();

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  };

  return (
    <header style={headerStyle}>
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{subtitle}</div>
        )}
        {showUserInfo && user && (
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            Participant: {user.participantId}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {children}

        {onBackClick && (
          <Button onClick={onBackClick} variant="secondary" size="small">
            {backButtonText}
          </Button>
        )}

        {showLogout && (
          <Button onClick={logout} variant="danger" size="small">
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
