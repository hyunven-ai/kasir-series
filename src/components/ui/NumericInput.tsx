'use client';

import React from 'react';

interface NumericInputProps {
  value: number | string;
  onChange: (val: number, rawString: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function NumericInput({
  value,
  onChange,
  className = 'form-control',
  placeholder = '0',
  id,
  required,
  disabled
}: NumericInputProps) {
  // Convert number to Indonesian thousand separator format
  const formatValue = (val: number | string) => {
    if (val === undefined || val === null || val === '') return '';
    const cleanStr = String(val).replace(/\D/g, '');
    if (!cleanStr) return '';
    return parseInt(cleanStr, 10).toLocaleString('id-ID');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = rawVal === '' ? 0 : parseInt(rawVal, 10);
    onChange(num, rawVal);
  };

  return (
    <input
      type="text"
      className={className}
      placeholder={placeholder}
      value={formatValue(value)}
      onChange={handleChange}
      id={id}
      required={required}
      disabled={disabled}
    />
  );
}
