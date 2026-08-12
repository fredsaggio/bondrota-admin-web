'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useDebouncedValue } from '@/shared/application/use-debounced-value';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  name: string;
  /** Busca as opções no servidor. O termo já vem com debounce aplicado. */
  search(term: string): Promise<ComboboxOption[]>;
  defaultValue?: string;
  /** Rótulo do valor já selecionado, para editar sem precisar buscar de novo. */
  defaultLabel?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Select cujas opções vêm da API conforme o usuário digita, para listas grandes
 * demais para carregar inteiras. O valor escolhido vai num input escondido, então
 * o `FormData` do formulário funciona igual a um `<select>` comum.
 */
export function AsyncCombobox({ label, name, search, defaultValue = '', defaultLabel = '', required, disabled, placeholder = 'Digite para buscar' }: Props) {
  const [term, setTerm] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [selected, setSelected] = useState<ComboboxOption | null>(
    defaultValue ? { value: defaultValue, label: defaultLabel || `#${defaultValue}` } : null,
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const debouncedTerm = useDebouncedValue(term);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      search(debouncedTerm)
        .then((values) => { if (active) setOptions(values); })
        .catch(() => { if (active) setOptions([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [debouncedTerm, open, search]);

  // Clicar fora fecha a lista sem alterar o que já estava escolhido.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function choose(option: ComboboxOption) {
    setSelected(option);
    setTerm('');
    setOpen(false);
  }

  return (
    <div className="relative sm:col-span-2" ref={containerRef}>
      <label className="field-label" htmlFor={`${name}-busca`}>
        {label}{required && <b className="ml-1 text-red-500">*</b>}
      </label>

      {/* O valor real do formulário; o campo de texto acima é só a busca. */}
      <input type="hidden" name={name} value={selected?.value ?? ''} />

      <input
        id={`${name}-busca`}
        className="field"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={selected ? selected.label : placeholder}
        value={term}
        onChange={(event) => { setTerm(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
      />

      {selected && !open && (
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate">{selected.label}</span>
          {!disabled && <button type="button" className="text-red-500" onClick={() => setSelected(null)}>limpar</button>}
        </p>
      )}

      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#dfe5ed] bg-white shadow-lg">
          {loading && <li className="px-3 py-2 text-xs text-slate-400">Buscando...</li>}
          {!loading && options.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Nenhum resultado</li>}
          {!loading && options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === selected?.value}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => choose(option)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
