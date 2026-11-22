import { clsx } from 'clsx';
import { useEffect, useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import styles from './OtpInput.module.css';

export interface OtpInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Chamado quando os 6 dígitos estão preenchidos (ex.: envia o formulário). */
  onComplete?: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  focusOnMount?: boolean;
  className?: string;
}

/**
 * Código de verificação em casas separadas (design system › OtpInput):
 * avança ao digitar, volta no Backspace, setas navegam, colar distribui os dígitos,
 * e a primeira casa aceita o preenchimento automático do SMS (one-time-code).
 */
export function OtpInput({
  label = 'Código de verificação',
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  disabled,
  focusOnMount,
  className,
}: OtpInputProps) {
  const id = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  // A tela do código só tem essa tarefa: focar a primeira casa poupa um toque.
  useEffect(() => {
    if (focusOnMount) refs.current[0]?.focus();
  }, [focusOnMount]);

  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  function commit(next: string, focusIndex?: number) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (focusIndex !== undefined) focusAt(focusIndex);
    if (clean.length === length) onComplete?.(clean);
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    // Preenchimento automático/colagem numa casa: distribui a partir daqui
    const chars = digits.slice();
    typed.split('').forEach((ch, k) => {
      if (index + k < length) chars[index + k] = ch;
    });
    commit(chars.join(''), Math.min(index + typed.length, length - 1));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = digits.slice();
      if (chars[index]) {
        chars[index] = '';
        commit(chars.join(''), index);
      } else if (index > 0) {
        chars[index - 1] = '';
        commit(chars.join(''), index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    commit(pasted, Math.min(pasted.length, length - 1));
  }

  const errorId = error ? `${id}-erro` : undefined;

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div role="group" aria-labelledby={`${id}-rotulo`} aria-describedby={errorId} className={styles.group}>
        <span id={`${id}-rotulo`} className="visually-hidden">
          {label}
        </span>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.cell}
            value={digit}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={length}
            aria-label={`Dígito ${i + 1} de ${length}`}
            aria-invalid={Boolean(error) || undefined}
            disabled={disabled}
          />
        ))}
      </div>
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
