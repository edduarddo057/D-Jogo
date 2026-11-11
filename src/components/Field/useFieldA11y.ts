import { useId, type ReactNode } from 'react';

/** Ids e atributos ARIA que todo campo precisa. */
export function useFieldA11y(id: string | undefined, hint: ReactNode, error: string | undefined) {
  const autoId = useId();
  const inputId = id ?? `campo-${autoId}`;
  const hintId = hint ? `${inputId}-dica` : undefined;
  const errorId = error ? `${inputId}-erro` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return { inputId, hintId, errorId, describedBy, invalid: Boolean(error) };
}
