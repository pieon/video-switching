// Reusable Card component
import React, { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}

export function Card({ children, style, padding = 32 }: CardProps) {
  return (
    <div
      style={{
        background: '#f9f9f9',
        padding,
        borderRadius: 16,
        border: '1px solid #ddd',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
