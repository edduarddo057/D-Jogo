import { useQueryClient } from '@tanstack/react-query';
import { Download, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { signOut } from '@/features/auth';
import { useDeleteAccount, useExportMyData, useMe } from '@/features/profile';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './PrivacyAccountPage.module.css';

/** /perfil/privacidade — documentos, baixar meus dados e excluir conta (LGPD; RN-91, RN-92). */
export function PrivacyAccountPage() {
  const me = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exportData = useExportMyData();
  const remove = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const close = () => {
    setConfirming(false);
    setUnderstood(false);
    setBlocked(false);
  };

  const doDelete = () =>
    remove.mutate(undefined, {
      onSuccess: async () => {
        await signOut(queryClient);
        toast('Sua conta foi excluída. Até a próxima!', { tone: 'success' });
        navigate('/entrar', { replace: true });
      },
      onError: (e) => {
        if (isApiError(e) && e.code === 'OWNER_HAS_ACTIVE_GROUPS') setBlocked(true);
        else toast(isApiError(e) ? messageFor(e.code) : 'Não deu para excluir a conta.', { tone: 'error' });
      },
    });

  return (
    <div className={styles.page}>
      <PageHeader title="Privacidade e conta" back={{ to: '/perfil', label: 'Voltar para o Perfil' }} />

      <section className={styles.section} aria-labelledby="docs">
        <h2 id="docs" className={styles.title}>
          Documentos
        </h2>
        <List label="Documentos">
          <ListItem
            to="/termos"
            leading={<FileText aria-hidden="true" />}
            title="Termos de uso"
            meta={me.data?.termsVersion ? `Você aceitou a versão ${me.data.termsVersion}` : undefined}
          />
          <ListItem
            to="/privacidade"
            leading={<ShieldCheck aria-hidden="true" />}
            title="Política de privacidade"
            meta="Quais dados usamos e por quê"
          />
        </List>
      </section>

      <section className={styles.section} aria-labelledby="meus-dados">
        <h2 id="meus-dados" className={styles.title}>
          Seus dados
        </h2>
        <p className={styles.text}>
          Baixe uma cópia de tudo o que o Dá Jogo guarda sobre você: conta, turmas, presenças e pagamentos, em um
          arquivo JSON.
        </p>
        <Button
          variant="outline"
          icon={<Download size={20} aria-hidden="true" />}
          loading={exportData.isPending}
          onClick={() =>
            exportData.mutate(undefined, { onSuccess: () => toast('Arquivo baixado.', { tone: 'success' }) })
          }
        >
          Baixar meus dados
        </Button>
      </section>

      <section className={styles.section} aria-labelledby="excluir">
        <h2 id="excluir" className={styles.title}>
          Excluir conta
        </h2>
        <p className={styles.text}>
          Apaga seu nome, foto e telefone e tira você das próximas partidas. Nas listas antigas, você aparece como
          “Jogador removido”. Não dá para desfazer.
        </p>
        <Button variant="danger" icon={<Trash2 size={20} aria-hidden="true" />} onClick={() => setConfirming(true)}>
          Excluir minha conta
        </Button>
      </section>

      <Modal
        open={confirming}
        onClose={close}
        title={blocked ? 'Antes, resolva suas turmas' : 'Excluir sua conta?'}
        description={
          blocked
            ? messageFor('OWNER_HAS_ACTIVE_GROUPS')
            : 'Você sai de todas as turmas e das próximas partidas. Pagamentos já registrados continuam no caixa das turmas, sem seu nome.'
        }
        actions={
          blocked ? (
            <>
              <Button variant="outline" onClick={close}>
                Fechar
              </Button>
              <ButtonLink to="/turmas">Ver minhas turmas</ButtonLink>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button variant="danger" disabled={!understood} loading={remove.isPending} onClick={doDelete}>
                Excluir conta
              </Button>
            </>
          )
        }
      >
        {!blocked && (
          <label className={styles.check}>
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>Entendo que a exclusão é definitiva.</span>
          </label>
        )}
      </Modal>
    </div>
  );
}
