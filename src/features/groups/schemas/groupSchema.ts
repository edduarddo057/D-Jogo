import { z } from 'zod';

const cents = z
  .number({ error: 'Informe o valor' })
  .int()
  .min(0, 'Valor inválido')
  .max(100_000_00, 'Valor alto demais');

/** Dados da turma (RN-08, RN-09). Pix é opcional, mas chave e titular andam juntos. */
export const groupSchema = z
  .object({
    name: z.string().trim().min(3, 'Mínimo de 3 letras').max(60, 'Máximo de 60 caracteres'),
    locationName: z.string().trim().min(2, 'Diga onde vocês jogam').max(80, 'Máximo de 80 caracteres'),
    locationAddress: z.string().trim().max(160, 'Máximo de 160 caracteres'),
    defaultCapacity: z
      .number({ error: 'Informe as vagas' })
      .int('Use um número inteiro')
      .min(2, 'Mínimo de 2 vagas')
      .max(60, 'Máximo de 60 vagas'),
    monthlyFeeCents: cents,
    dropInFeeCents: cents,
    pixKey: z.string().trim().max(77, 'Chave longa demais'),
    pixHolder: z.string().trim().max(60, 'Máximo de 60 caracteres'),
  })
  .superRefine((v, ctx) => {
    if (v.pixKey && !v.pixHolder)
      ctx.addIssue({ code: 'custom', path: ['pixHolder'], message: 'Informe o titular da chave' });
    if (v.pixHolder && !v.pixKey) ctx.addIssue({ code: 'custom', path: ['pixKey'], message: 'Informe a chave Pix' });
  });

export type GroupFormValues = z.infer<typeof groupSchema>;
