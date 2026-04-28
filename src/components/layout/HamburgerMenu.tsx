// Hamburger menu component with user info and logout
import { useState, useRef, useEffect, CSSProperties } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export function HamburgerMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 1000,
  };

  const buttonStyle: CSSProperties = {
    fontSize: 24,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    lineHeight: 1,
  };

  const menuStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    border: '1px solid #ddd',
    background: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: 200,
  };

  return (
    <div ref={menuRef} style={containerStyle}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        ☰
      </button>

      {isOpen && (
        <div style={menuStyle}>
          {user && (
            <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
              Participant: {user.participantId}
            </div>
          )}
          <Button onClick={logout} variant="danger" size="small">
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}
