// Alert component for displaying messages
import React, { CSSProperties, ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'error' | 'success' | 'info' | 'warning';
  style?: CSSProperties;
}

export function Alert({ children, variant = 'info', style }: AlertProps) {
  const variants: Record<string, CSSProperties> = {
    error: {
      background: '#fee',
      color: '#c00',
    },
    success: {
      background: '#efe',
      color: '#0a0',
    },
    info: {
      background: '#eef',
      color: '#00a',
    },
    warning: {
      background: '#ffe',
      color: '#aa0',
    },
  };

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 14,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
