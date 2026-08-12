/**
 * Resposta paginada por cursor da API. O `next_cursor` é opaco: o front só o
 * devolve como veio, nunca monta um. Ele só existe quando `has_more` é true.
 */
export interface CursorPage<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
}
