// Reusable Button component
import React, { CSSProperties } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
  size = 'medium',
}: ButtonProps) {
  const baseStyle: CSSProperties = {
    fontWeight: 600,
    border: 'none',
    borderRadius: variant === 'secondary' ? 8 : 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    ...style,
  };

  const sizeStyles: Record<string, CSSProperties> = {
    small: { padding: '6px 12px', fontSize: 12 },
    medium: { padding: '12px 24px', fontSize: 14 },
    large: { padding: '16px 32px', fontSize: 18 },
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      background: disabled ? '#ccc' : '#007AFF',
      color: 'white',
    },
    secondary: {
      background: '#424242ff',
      color: '#aaaaaaff',
      border: '1px solid #666666ff',
    },
    danger: {
      background: '#dc3545',
      color: 'white',
    },
    warning: {
      background: '#ffc107',
      color: '#000',
    },
  };

  const widthStyle = fullWidth ? { width: '100%' } : {};

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...widthStyle,
      }}
    >
      {children}
    </button>
  );
}
