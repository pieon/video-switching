// Reusable Input component
import React, { CSSProperties } from 'react';

interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  style?: CSSProperties;
  fullWidth?: boolean;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  style,
  fullWidth = true,
}: InputProps) {
  const baseStyle: CSSProperties = {
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #ddd',
    marginBottom: 16,
    boxSizing: 'border-box',
    ...style,
  };

  const widthStyle = fullWidth ? { width: '100%' } : {};

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      style={{
        ...baseStyle,
        ...widthStyle,
      }}
    />
  );
}
