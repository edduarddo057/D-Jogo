import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { maskBrazilianPhone, toE164Brazil } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { useRequestOtp } from '../../hooks/useLogin';
import { useLoginStore } from '../../stores/loginStore';
import styles from './LoginPhoneForm.module.css';

const schema = z.object({
  phone: z.string().refine((v) => toE164Brazil(v) !== null, 'Digite o celular com DDD, ex.: (21) 99876-5432'),
  channel: z.enum(['whatsapp', 'sms']),
});
type Form = z.infer<typeof schema>;

/** Passo 1 do login: celular e canal do código (RN-01). */
export function LoginPhoneForm() {
  const navigate = useNavigate();
  const { challenge, channel } = useLoginStore();
  const request = useRequestOtp();
  const { control, handleSubmit, register, formState, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { phone: challenge ? maskBrazilianPhone(challenge.phone.replace(/^\+55/, '')) : '', channel },
  });

  const onSubmit = handleSubmit(async ({ phone, channel: ch }) => {
    useLoginStore.getState().setChannel(ch);
    try {
      await request.mutateAsync({ phone: toE164Brazil(phone) ?? phone, channel: ch });
      navigate('/entrar/codigo');
    } catch (error) {
      setError('phone', { message: isApiError(error) ? messageFor(error.code) : 'Não deu para enviar o código.' });
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label="Seu celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(21) 99876-5432"
            {...field}
            onChange={(e) => field.onChange(maskBrazilianPhone(e.target.value))}
            error={fieldState.error?.message}
          />
        )}
      />

      <fieldset className={styles.channels}>
        <legend className={styles.legend}>Receber o código por</legend>
        <label className={styles.channel}>
          <input type="radio" value="whatsapp" {...register('channel')} />
          WhatsApp
        </label>
        <label className={styles.channel}>
          <input type="radio" value="sms" {...register('channel')} />
          SMS
        </label>
      </fieldset>

      <Button type="submit" block loading={formState.isSubmitting}>
        Receber código
      </Button>
    </form>
  );
}
