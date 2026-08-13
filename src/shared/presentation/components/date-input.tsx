'use client';

import { useEffect, useRef, useState } from 'react';

interface DateInputProps {
  name?: string;
  defaultValue?: string;
  onChange?(value: string): void;
  required?: boolean;
  className?: string;
  autoComplete?: string;
}

/** Converte a data ISO usada pela API para a forma exibida no painel. */
export function formatBrazilianDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toISODate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12) return '';

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return '';

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** Campo visual DD/MM/AAAA que mantém no formulário o valor ISO esperado pela API. */
export function DateInput({ name, defaultValue = '', onChange, required, className = 'field', autoComplete }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatBrazilianDate(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);
  const isoValue = toISODate(displayValue);

  useEffect(() => {
    const invalid = displayValue !== '' && isoValue === '';
    inputRef.current?.setCustomValidity(invalid ? 'Informe uma data válida no formato DD/MM/AAAA.' : '');
  }, [displayValue, isoValue]);

  return (
    <>
      <input
        ref={inputRef}
        className={className}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={displayValue}
        onChange={(event) => {
          const nextDisplayValue = maskDate(event.target.value);
          const nextISOValue = toISODate(nextDisplayValue);
          setDisplayValue(nextDisplayValue);
          if ((nextISOValue || nextDisplayValue === '') && nextISOValue !== isoValue) onChange?.(nextISOValue);
        }}
        required={required}
        autoComplete={autoComplete}
        maxLength={10}
      />
      {name && <input type="hidden" name={name} value={isoValue} />}
    </>
  );
}
