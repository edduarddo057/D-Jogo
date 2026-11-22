import { clsx } from 'clsx';
import { useState } from 'react';
import { avatarTone, initials } from '@/lib/format';
import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  /** Id estável (do usuário): define a cor das iniciais, sempre a mesma para a mesma pessoa. */
  id: string;
  src?: string | null;
  size?: AvatarSize;
  /** Decorativo quando o nome já aparece ao lado (padrão em listas). */
  decorative?: boolean;
  className?: string;
}

/** Foto ou iniciais sobre uma das cores color-avatar-1..4 (design system › Avatar). */
export function Avatar({ name, id, src, size = 'md', decorative = false, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': name };

  return (
    <span className={clsx(styles.avatar, styles[size], styles[`tone${avatarTone(id)}`], className)} {...a11y}>
      {showImage ? (
        <img className={styles.image} src={src ?? undefined} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ id: string; name: string; photoUrl?: string | null }>;
  /** Total real (para o "+N"); padrão = people.length. */
  total?: number;
  max?: number;
  className?: string;
}

/** Até `max` avatares sobrepostos + contador. O conjunto tem um rótulo com os nomes. */
export function AvatarStack({ people, total = people.length, max = 5, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest = total - shown.length;
  const label = `${shown.map((p) => p.name.split(' ')[0]).join(', ')}${rest > 0 ? ` e mais ${rest}` : ''}`;

  return (
    <span className={clsx(styles.stack, className)} role="img" aria-label={label}>
      {shown.map((p) => (
        <Avatar
          key={p.id}
          id={p.id}
          name={p.name}
          src={p.photoUrl ?? null}
          size="sm"
          decorative
          className={styles.stacked}
        />
      ))}
      {rest > 0 && (
        <span className={clsx(styles.avatar, styles.sm, styles.more, styles.stacked)} aria-hidden="true">
          +{rest}
        </span>
      )}
    </span>
  );
}
