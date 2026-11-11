import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/Button';
import { OtpInput } from '@/components/OtpInput';
import { formatE164Brazil } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useLogin';
import { useLoginStore } from '../../stores/loginStore';
import styles from './LoginCodeForm.module.css';

const secondsUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));

/** Passo 2 do login: código de 6 dígitos, com reenvio após 60 s (RN-01). */
export function LoginCodeForm() {
  const challenge = useLoginStore((s) => s.challenge);
  const channel = useLoginStore((s) => s.channel);
  const verify = useVerifyOtp();
  const resend = useRequestOtp();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [wait, setWait] = useState(() => (challenge ? secondsUntil(challenge.resendAvailableAt) : 0));

  useEffect(() => {
    if (!challenge) return;
    const tick = () => setWait(secondsUntil(challenge.resendAvailableAt));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  if (!challenge) return <Navigate to="/entrar" replace />;

  async function submit(value: string) {
    if (!challenge || value.length !== 6) return;
    setError(undefined);
    try {
      await verify.mutateAsync({ challengeId: challenge.challengeId, code: value });
    } catch (e) {
      setCode('');
      setError(isApiError(e) ? messageFor(e.code) : 'Não deu para validar o código.');
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(code);
      }}
      noValidate
    >
      <p className={styles.sentTo}>
        Enviamos 6 dígitos pelo {channel === 'sms' ? 'SMS' : 'WhatsApp'} para{' '}
        <strong>{formatE164Brazil(challenge.phone)}</strong>.{' '}
        <Link to="/entrar" className={styles.link}>
          Trocar número
        </Link>
      </p>

      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={(v) => void submit(v)}
        error={error}
        disabled={verify.isPending}
        focusOnMount
      />

      <Button type="submit" block loading={verify.isPending} disabled={code.length !== 6}>
        Entrar
      </Button>

      <div className={styles.resend} aria-live="polite">
        {wait > 0 ? (
          <span>Reenviar código em 0:{String(wait).padStart(2, '0')}</span>
        ) : (
          <Button
            variant="ghost"
            loading={resend.isPending}
            onClick={() => {
              setError(undefined);
              resend.mutate({ phone: challenge.phone, channel });
            }}
          >
            Reenviar código
          </Button>
        )}
      </div>
    </form>
  );
}
