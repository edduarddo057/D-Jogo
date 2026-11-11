import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useAddMember } from '../../queries/useMembers';
import styles from '../MembersList/MembersList.module.css';

const schema = z.object({
  nickname: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(z.string().regex(/^[a-z0-9._]{3,20}$/, 'Digite o nickname, ex.: @camila')),
  type: z.enum(['monthly', 'drop_in']),
});
type Form = z.input<typeof schema>;

/** "+ Jogador": adiciona quem já tem conta, pelo nickname (RN-14). Para quem não tem, use o convite. */
export function AddMemberModal({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const add = useAddMember(groupId);
  const { register, handleSubmit, setValue, control, reset, setError, formState } = useForm<
    Form,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { nickname: '', type: 'monthly' },
  });
  const type = useWatch({ control, name: 'type' });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const member = await add.mutateAsync(v);
      toast(`${member.user.name} entrou na turma.`, { tone: 'success' });
      close();
    } catch (error) {
      setError('nickname', { message: isApiError(error) ? messageFor(error.code) : 'Não deu para adicionar.' });
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Adicionar jogador"
      description="Para quem já usa o Dá Jogo. Quem ainda não tem conta entra pelo link de convite."
    >
      <form className={styles.confirm} onSubmit={onSubmit} noValidate>
        <TextField
          label="Nickname"
          placeholder="@camila"
          autoCapitalize="none"
          spellCheck={false}
          {...register('nickname')}
          error={formState.errors.nickname?.message}
        />
        <SegmentedControl
          label="Tipo de vínculo"
          options={[
            { value: 'monthly', label: 'Mensalista' },
            { value: 'drop_in', label: 'Avulso' },
          ]}
          value={type}
          onChange={(v) => setValue('type', v)}
        />
        <Button type="submit" block loading={formState.isSubmitting}>
          Adicionar
        </Button>
      </form>
    </Modal>
  );
}
