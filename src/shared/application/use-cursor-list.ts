'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorPage } from '@/shared/domain/pagination';

/**
 * Lista paginada por cursor, acumulando páginas ("carregar mais").
 *
 * `load` deve ser memoizado com `useCallback`: é a mudança de identidade dele
 * (busca nova, filtro novo) que reinicia a lista do zero.
 */
export function useCursorList<T>(load: (cursor?: string) => Promise<CursorPage<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Descarta resposta de requisição obsoleta: digitando rápido, uma busca antiga
  // pode chegar depois da nova e sobrescrever o resultado certo.
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const page = await load(undefined);
      if (generation.current !== current) return;
      setItems(page.items);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (reason) {
      if (generation.current !== current) return;
      setItems([]);
      setCursor(undefined);
      setHasMore(false);
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.');
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    const current = ++generation.current;
    setLoadingMore(true);
    setError('');
    try {
      const page = await load(cursor);
      if (generation.current !== current) return;
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (reason) {
      if (generation.current !== current) return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais itens.');
    } finally {
      if (generation.current === current) setLoadingMore(false);
    }
  }, [cursor, load]);

  useEffect(() => {
    // setTimeout adia o setState para fora do corpo síncrono do efeito, mesma
    // convenção de useResource.
    const timeout = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timeout);
  }, [reload]);

  return { items, hasMore, loading, loadingMore, error, reload, loadMore };
}
