import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { GroupForm, useCreateGroup } from '@/features/groups';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /turmas/nova — quem cria vira o organizador (RN-08). */
export function CreateGroupPage() {
  const navigate = useNavigate();
  const create = useCreateGroup();
  return (
    <div className={styles.page}>
      <PageHeader
        title="Nova turma"
        subtitle="Você será o organizador. Dá para mudar tudo depois."
        back={{ to: '/turmas', label: 'Voltar para Turmas' }}
      />
      <GroupForm
        submitLabel="Criar turma"
        onSubmit={async (values) => {
          try {
            const group = await create.mutateAsync({ ...values, sportId: 'volleyball', timezone: 'America/Sao_Paulo' });
            toast('Turma criada! Agora é só convidar a galera.', { tone: 'success' });
            navigate(`/turmas/${group.id}`, { replace: true });
          } catch (error) {
            toast(isApiError(error) ? messageFor(error.code) : 'Não deu para criar a turma.', { tone: 'error' });
          }
        }}
      />
    </div>
  );
}
