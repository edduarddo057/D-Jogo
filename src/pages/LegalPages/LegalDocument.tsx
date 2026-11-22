import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TERMS_VERSION } from '@/lib/config';
import styles from './LegalPages.module.css';

/** Moldura dos textos legais: título, versão, aviso de minuta e o texto. */
export function LegalDocument({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className={styles.doc}>
      <PageHeader
        title={title}
        subtitle={`Versão ${TERMS_VERSION}`}
        back={{ to: '/', label: 'Voltar para o Dá Jogo' }}
      />
      <p className={styles.draft} role="note">
        <strong>Minuta.</strong> Este texto ainda passa por revisão jurídica antes da publicação do app.
      </p>
      <div className={styles.body}>{children}</div>
    </article>
  );
}
