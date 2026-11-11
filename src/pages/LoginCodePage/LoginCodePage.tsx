import { LoginCodeForm } from '@/features/auth';
import styles from './AuthPage.module.css';

/** /entrar/codigo */
export function LoginCodePage() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Digite o código</h1>
      </header>
      <LoginCodeForm />
    </>
  );
}
