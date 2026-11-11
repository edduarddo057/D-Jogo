import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { toast } from '@/stores';
import { isApiError, messageFor } from '@/lib/http';
import type { Me } from '../../api/meApi';
import { useUpdateProfile } from '../../queries/useProfileQueries';
import { profileSchema, type ProfileFormValues } from '../../schemas/profileSchema';
import { PROFILE_SPORT_ID, ProfileFields } from '../ProfileFields/ProfileFields';
import styles from '../OnboardingForm/OnboardingForm.module.css';

/** Perfil › Seus dados. */
export function EditProfileForm({ me }: { me: Me }) {
  const navigate = useNavigate();
  const update = useUpdateProfile();
  const sport = me.sportProfiles.find((s) => s.sportId === PROFILE_SPORT_ID);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { name: me.name, nickname: me.nickname, positions: sport?.positions ?? [], level: sport?.level },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        name: v.name,
        nickname: v.nickname,
        sportProfile: { sportId: PROFILE_SPORT_ID, positions: v.positions, level: v.level },
      });
      toast('Dados atualizados.', { tone: 'success' });
      navigate('/perfil');
    } catch (error) {
      if (isApiError(error) && error.code === 'NICKNAME_TAKEN')
        form.setError('nickname', { message: messageFor(error.code) });
      else toast(isApiError(error) ? messageFor(error.code) : 'Não deu para salvar.', { tone: 'error' });
    }
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <ProfileFields currentNickname={me.nickname} />
        <Button type="submit" block loading={form.formState.isSubmitting}>
          Salvar
        </Button>
      </form>
    </FormProvider>
  );
}
