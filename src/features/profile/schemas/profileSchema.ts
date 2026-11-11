import { z } from 'zod';

/** Regras de perfil (RN-02, RN-03). Mesmas mensagens no cadastro e na edição. */
export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,20}$/, 'Use de 3 a 20 caracteres: letras sem acento, números, ponto ou _');

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Digite seu nome').max(60, 'Máximo de 60 caracteres'),
  nickname: nicknameSchema,
  positions: z.array(z.string()).min(1, 'Escolha ao menos uma posição').max(3, 'No máximo 3 posições'),
  level: z.number({ error: 'Escolha seu nível' }).int().min(1).max(5),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const onboardingSchema = profileSchema.extend({
  acceptTerms: z.literal(true, { error: 'Para continuar, aceite os termos de uso' }),
});
export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
