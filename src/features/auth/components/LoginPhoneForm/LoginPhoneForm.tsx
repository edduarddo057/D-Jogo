import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { Dock } from '@/components/Dock';
import { TextField } from '@/components/TextField';
import { maskBrazilianPhone, toE164Brazil } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { useRequestOtp } from '../../hooks/useLogin';
import { useLoginStore } from '../../stores/loginStore';
import styles from './LoginPhoneForm.module.css';

/** Celular (manual 3.1): um campo só, sem senha. O código vai pelo WhatsApp; dá para pedir por SMS. */
export function LoginPhoneForm() {
  const navigate = useNavigate();
  const challenge = useLoginStore((s) => s.challenge);
  const request = useRequestOtp();
  const [phone, setPhone] = useState(challenge ? maskBrazilianPhone(challenge.phone.replace(/^\+55/, '')) : '');
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState<'whatsapp' | 'sms' | null>(null);

  const send = async (channel: 'whatsapp' | 'sms') => {
    const e164 = toE164Brazil(phone);
    if (!e164) {
      setError('Digite o celular com DDD, ex.: (11) 98765-4321.');
      return;
    }
    setError(undefined);
    setSending(channel);
    useLoginStore.getState().setChannel(channel);
    try {
      await request.mutateAsync({ phone: e164, channel });
      navigate('/entrar/codigo');
    } catch (e) {
      setError(isApiError(e) ? messageFor(e.code) : 'Não deu para enviar o código. Tente de novo.');
    } finally {
      setSending(null);
    }
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void send('whatsapp');
      }}
    >
      <p className={styles.muted}>Você entra com seu número. Sem senha.</p>
      <TextField
        label="Celular"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 98765-4321"
        prefix="+55"
        value={phone}
        onChange={(e) => setPhone(maskBrazilianPhone(e.target.value))}
        hint="Enviamos um código de 6 números pelo WhatsApp."
        error={error}
      />
      <Dock>
        <Button type="submit" block loading={sending === 'whatsapp'} disabled={sending !== null}>
          Enviar código
        </Button>
        <Button
          variant="ghost"
          block
          loading={sending === 'sms'}
          disabled={sending !== null}
          onClick={() => void send('sms')}
        >
          Receber por SMS
        </Button>
      </Dock>
    </form>
  );
}
