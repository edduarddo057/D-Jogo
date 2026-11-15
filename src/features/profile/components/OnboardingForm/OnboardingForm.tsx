import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { TERMS_VERSION } from '@/lib/config';
import { isApiError, messageFor } from '@/lib/http';
import { toast, useSessionStore } from '@/stores';
import { useCompleteOnboarding } from '../../queries/useProfileQueries';
import { onboardingSchema, type OnboardingFormValues } from '../../schemas/profileSchema';
import { PROFILE_SPORT_ID, ProfileFields } from '../ProfileFields/ProfileFields';
import styles from './OnboardingForm.module.css';

/** Cadastro (RN-02…RN-04): nome, nickname, posições, nível e aceite dos termos. */
export function OnboardingForm({ defaultName = '' }: { defaultName?: string }) {
  const navigate = useNavigate();
  const complete = useCompleteOnboarding();
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      name: defaultName,
      nickname: '',
      positions: [],
      level: undefined,
      acceptTerms: false as unknown as true,
    },
  });
  const { register, handleSubmit, formState, setError } = form;

  const onSubmit = handleSubmit(async (v) => {
    const session = useSessionStore.getState();
    const inviteCode = session.pendingInviteCode ?? undefined;
    try {
      const { joinedGroupId } = await complete.mutateAsync({
        name: v.name,
        nickname: v.nickname,
        sportProfile: { sportId: PROFILE_SPORT_ID, positions: v.positions, level: v.level },
        acceptedTermsVersion: TERMS_VERSION,
        inviteCode,
      });
      if (inviteCode) session.setPendingInvite(null);
      const target = joinedGroupId ? `/turmas/${joinedGroupId}` : (session.redirectTo ?? '/');
      session.setRedirectTo(target);
      toast(joinedGroupId ? 'Tudo pronto! Você já está na turma.' : 'Perfil criado. Bora jogar!', { tone: 'success' });
      navigate(target, { replace: true });
    } catch (error) {
      if (isApiError(error) && error.code === 'NICKNAME_TAKEN') {
        setError('nickname', { message: messageFor(error.code) });
      } else {
        toast(isApiError(error) ? messageFor(error.code) : 'Não deu para salvar. Tente de novo.', { tone: 'error' });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <ProfileFields />
        <div className={styles.terms}>
          <label className={styles.check}>
            <input
              type="checkbox"
              {...register('acceptTerms')}
              aria-invalid={!!formState.errors.acceptTerms || undefined}
            />
            <span>
              Li e aceito os{' '}
              <a href={`${import.meta.env.BASE_URL}termos`} target="_blank">
                termos de uso
              </a>{' '}
              e a{' '}
              <a href={`${import.meta.env.BASE_URL}privacidade`} target="_blank">
                política de privacidade
              </a>
              .
            </span>
          </label>
          {formState.errors.acceptTerms && (
            <span className={styles.error} role="alert">
              {formState.errors.acceptTerms.message}
            </span>
          )}
        </div>
        <Button type="submit" block loading={formState.isSubmitting}>
          Concluir cadastro
        </Button>
      </form>
    </FormProvider>
  );
}
