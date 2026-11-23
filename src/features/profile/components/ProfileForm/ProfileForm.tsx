import { Camera } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Check';
import { Chips } from '@/components/Chips';
import { TextField } from '@/components/TextField';
import { appUrl, TERMS_VERSION } from '@/lib/config';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { uploadPhoto, type Gender, type Me } from '../../api/meApi';
import {
  useCompleteOnboarding,
  useNicknameAvailability,
  useSports,
  useUpdateProfile,
} from '../../queries/useProfileQueries';
import { nicknameSchema } from '../../schemas/profileSchema';
import styles from './ProfileForm.module.css';

export interface ProfileFormProps {
  /** "onboarding" tem o aceite dos termos no mesmo formulário (manual 3.1). */
  mode: 'onboarding' | 'edit';
  me?: Me | null;
  /** Modalidade das posições (a da turma do convite, no primeiro acesso). */
  sportId?: string;
  inviteCode?: string | null;
  formId: string;
  onDone: (result: { joinedGroupId?: string | null }) => void;
  onBusyChange?: (busy: boolean) => void;
}

type GenderChoice = 'female' | 'male' | 'none';

/** Seu perfil: nome, apelido, posições e gênero opcional (visível só para o organizador). */
export function ProfileForm({
  mode,
  me,
  sportId: sportProp,
  inviteCode,
  formId,
  onDone,
  onBusyChange,
}: ProfileFormProps) {
  const sports = useSports();
  const sportId = sportProp ?? me?.sportProfiles[0]?.sportId ?? 'volleyball';
  const sport = sports.data?.find((s) => s.id === sportId) ?? sports.data?.[0];
  const [name, setName] = useState(me?.name ?? '');
  const [nickname, setNickname] = useState(me?.nickname ?? '');
  const [positions, setPositions] = useState<string[]>(me?.sportProfiles[0]?.positions ?? []);
  const [gender, setGender] = useState<GenderChoice>(me?.gender ?? 'none');
  const [terms, setTerms] = useState(false);
  const [photo, setPhoto] = useState<string | null>(me?.photoUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const availability = useNicknameAvailability(nickname, me?.nickname);
  const onboard = useCompleteOnboarding();
  const update = useUpdateProfile();

  const nickTaken = availability.data && !availability.data.available;
  const suggestion = availability.data?.suggestions[0];

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { photoUrl } = await uploadPhoto(file);
      setPhoto(photoUrl);
    } catch (e) {
      toast(isApiError(e) ? messageFor(e.code) : 'Não deu para enviar a foto.', { tone: 'error' });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Digite seu nome.';
    const nick = nicknameSchema.safeParse(nickname);
    if (!nick.success) next.nickname = 'Use de 3 a 20 letras sem acento, números, ponto ou _.';
    else if (nickTaken)
      next.nickname = suggestion ? `Esse apelido já existe. Que tal “${suggestion}”?` : 'Esse apelido já existe.';
    if (positions.length === 0) next.positions = 'Escolha ao menos uma posição.';
    if (mode === 'onboarding' && !terms) next.terms = 'Para entrar, aceite os termos e a política de privacidade.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const g: Gender | null = gender === 'none' ? null : gender;
    const sportProfile = { sportId: sport?.id ?? sportId, positions };
    onBusyChange?.(true);
    try {
      if (mode === 'onboarding') {
        const res = await onboard.mutateAsync({
          name: name.trim(),
          nickname: nick.data ?? nickname,
          sportProfile,
          gender: g,
          acceptedTermsVersion: TERMS_VERSION,
          ...(inviteCode ? { inviteCode } : {}),
        });
        onDone({ joinedGroupId: res.joinedGroupId ?? null });
      } else {
        await update.mutateAsync({ name: name.trim(), nickname: nick.data ?? nickname, gender: g, sportProfile });
        onDone({});
      }
    } catch (err) {
      if (isApiError(err) && err.code === 'NICKNAME_TAKEN')
        setErrors({ nickname: 'Esse apelido já existe. Escolha outro.' });
      else toast(isApiError(err) ? messageFor(err.code) : 'Não deu para salvar. Tente de novo.', { tone: 'error' });
    } finally {
      onBusyChange?.(false);
    }
  };

  return (
    <form id={formId} className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className={styles.photo}>
        <Avatar name={name || 'Você'} id={me?.id ?? 'novo'} src={photo} size="lg" />
        <Button
          variant="tint"
          size="sm"
          icon={<Camera size={16} aria-hidden="true" />}
          onClick={() => fileRef.current?.click()}
        >
          {photo ? 'Trocar foto' : 'Adicionar foto'}
        </Button>
        <span className={styles.help}>opcional</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Foto de perfil"
          onChange={(e) => void choosePhoto(e.target.files?.[0])}
        />
      </div>

      <TextField
        label="Nome"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <TextField
        label="Apelido"
        prefix="@"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={nickname}
        onChange={(e) => setNickname(e.target.value.toLowerCase())}
        hint={
          nickTaken && suggestion
            ? `Como você aparece nas listas. “${nickname}” já existia: que tal “${suggestion}”?`
            : 'Como você aparece nas listas.'
        }
        error={errors.nickname}
      />

      {sport && (
        <div className={styles.group}>
          <Chips
            label="Onde você joga?"
            hint={sport.name.toLowerCase()}
            multiple
            options={sport.positions.map((p) => ({ value: p.id, label: p.label.replace(/\(a\)$/, '') }))}
            value={positions}
            onChange={(v) => setPositions(v.slice(0, 3))}
          />
          {errors.positions && (
            <span className={styles.error} role="alert">
              {errors.positions}
            </span>
          )}
        </div>
      )}

      <Chips
        label="Gênero"
        hint="opcional · só o organizador vê, para equilibrar times"
        options={[
          { value: 'female', label: 'Feminino' },
          { value: 'male', label: 'Masculino' },
          { value: 'none', label: 'Prefiro não dizer' },
        ]}
        value={gender}
        onChange={setGender}
      />

      {mode === 'onboarding' && (
        <Checkbox checked={terms} onChange={setTerms} error={errors.terms}>
          Aceito os{' '}
          <a href={appUrl('termos')} target="_blank" rel="noreferrer">
            termos de uso
          </a>{' '}
          e a{' '}
          <a href={appUrl('privacidade')} target="_blank" rel="noreferrer">
            política de privacidade
          </a>
          .
        </Checkbox>
      )}
    </form>
  );
}
