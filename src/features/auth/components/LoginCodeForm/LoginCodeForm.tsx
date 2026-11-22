import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/Button';
import { Dock } from '@/components/Dock';
import { OtpInput } from '@/components/OtpInput';
import { formatE164Brazil } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useLogin';
import { useLoginStore } from '../../stores/loginStore';
import styles from './LoginCodeForm.module.css';

const secondsUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Código (manual 3.1): 6 números pelo WhatsApp, que se preenchem sozinhos. Dá para receber por SMS. */
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
    tick();
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
      setError(isApiError(e) ? messageFor(e.code) : 'Não deu para conferir o código. Tente de novo.');
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
      <p className={styles.muted}>
        Enviado pelo {channel === 'sms' ? 'SMS' : 'WhatsApp'} para {formatE164Brazil(challenge.phone)}.{' '}
        <Link to="/entrar" replace className={styles.link}>
          Trocar
        </Link>
      </p>
      <OtpInput
        label="Código de 6 números"
        value={code}
        onChange={setCode}
        onComplete={(v) => void submit(v)}
        error={error}
        disabled={verify.isPending}
        focusOnMount
      />
      <p className={styles.help}>O código se preenche sozinho quando a mensagem chega. Vale por 5 minutos.</p>
      <div aria-live="polite">
        {wait > 0 ? (
          <Button variant="ghost" disabled>
            Reenviar em {clock(wait)}
          </Button>
        ) : (
          <Button
            variant="ghost"
            loading={resend.isPending}
            onClick={() => {
              setError(undefined);
              resend.mutate({ phone: challenge.phone, channel: channel === 'sms' ? 'sms' : 'whatsapp' });
            }}
          >
            Reenviar código
          </Button>
        )}
      </div>
      <Dock>
        <Button type="submit" block loading={verify.isPending} disabled={code.length !== 6}>
          Continuar
        </Button>
      </Dock>
    </form>
  );
}
