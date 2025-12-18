// Page layout wrapper component
import React, { CSSProperties, ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: number;
  centered?: boolean;
  style?: CSSProperties;
}

export function PageLayout({
  children,
  maxWidth = 1200,
  centered = true,
  style,
}: PageLayoutProps) {
  const layoutStyle: CSSProperties = {
    width: '100%',
    maxWidth,
    margin: centered ? '40px auto' : '40px 0',
    fontFamily: 'system-ui',
    padding: '20px',
    boxSizing: 'border-box',
    ...style,
  };

  return <div style={layoutStyle}>{children}</div>;
}
