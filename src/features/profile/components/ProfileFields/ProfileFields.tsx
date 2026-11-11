import { CircleCheck } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useNicknameAvailability, useSports } from '../../queries/useProfileQueries';
import type { ProfileFormValues } from '../../schemas/profileSchema';
import styles from './ProfileFields.module.css';

const SPORT_ID = 'volleyball'; // MVP: só vôlei (o catálogo já suporta outras modalidades)

/** Campos de perfil compartilhados entre cadastro e edição (usa o FormProvider do formulário pai). */
export function ProfileFields({ currentNickname }: { currentNickname?: string }) {
  const { register, control, formState, setValue } = useFormContext<ProfileFormValues>();
  const sports = useSports();
  const sport = sports.data?.find((s) => s.id === SPORT_ID);
  const nickname = useWatch({ control, name: 'nickname' }) ?? '';
  const availability = useNicknameAvailability(nickname.trim().toLowerCase(), currentNickname);
  const taken = availability.data && !availability.data.available;

  return (
    <div className={styles.fields}>
      <TextField label="Seu nome" autoComplete="name" {...register('name')} error={formState.errors.name?.message} />

      <div className={styles.stack}>
        <TextField
          label="Nickname"
          autoComplete="nickname"
          autoCapitalize="none"
          spellCheck={false}
          hint="É como a galera te encontra no app."
          {...register('nickname')}
          error={formState.errors.nickname?.message ?? (taken ? 'Esse nickname já está em uso.' : undefined)}
        />
        {availability.data?.available && (
          <span className={styles.available} role="status">
            <CircleCheck size={16} aria-hidden="true" /> Disponível
          </span>
        )}
        {taken && availability.data && availability.data.suggestions.length > 0 && (
          <div className={styles.suggestions}>
            <span className={styles.suggestionsLabel}>Livres:</span>
            {availability.data.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.chip}
                onClick={() => setValue('nickname', s, { shouldValidate: true })}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!sport ? (
        <Skeleton shape="card" height="16rem" />
      ) : (
        <>
          <Controller
            control={control}
            name="positions"
            render={({ field, fieldState }) => (
              <fieldset className={styles.fieldset} aria-describedby={fieldState.error ? 'posicoes-erro' : undefined}>
                <legend className={styles.legend}>
                  Posições <span className={styles.legendHint}>(até 3, a primeira é a principal)</span>
                </legend>
                <div className={styles.chips}>
                  {sport.positions.map((p) => {
                    const index = field.value.indexOf(p.id);
                    const checked = index >= 0;
                    return (
                      <label key={p.id} className={styles.option}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && field.value.length >= 3}
                          onChange={() =>
                            field.onChange(checked ? field.value.filter((v) => v !== p.id) : [...field.value, p.id])
                          }
                        />
                        <span>{p.label}</span>
                        {index === 0 && <span className={styles.main}>principal</span>}
                      </label>
                    );
                  })}
                </div>
                {fieldState.error && (
                  <span id="posicoes-erro" className={styles.error} role="alert">
                    {fieldState.error.message}
                  </span>
                )}
              </fieldset>
            )}
          />

          <Controller
            control={control}
            name="level"
            render={({ field, fieldState }) => (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Seu nível</legend>
                <div className={styles.levels}>
                  {sport.levels.map((l) => (
                    <label key={l.value} className={styles.level}>
                      <input
                        type="radio"
                        name={field.name}
                        value={l.value}
                        checked={field.value === l.value}
                        onChange={() => field.onChange(l.value)}
                      />
                      <span className={styles.levelValue}>{l.value}</span>
                      <span className={styles.levelLabel}>{l.label}</span>
                    </label>
                  ))}
                </div>
                {fieldState.error && (
                  <span className={styles.error} role="alert">
                    {fieldState.error.message}
                  </span>
                )}
              </fieldset>
            )}
          />
        </>
      )}
    </div>
  );
}

export const PROFILE_SPORT_ID = SPORT_ID;
