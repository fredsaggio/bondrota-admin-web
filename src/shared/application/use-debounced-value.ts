'use client';

import { useEffect, useState } from 'react';

/**
 * Atrasa a propagação de um valor que muda a cada tecla. Usado na busca que vai
 * ao servidor: sem isso, cada caractere digitado viraria uma requisição.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
