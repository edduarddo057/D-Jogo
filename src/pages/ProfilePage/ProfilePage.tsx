import { useQueryClient } from '@tanstack/react-query';
import { History, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { signOut } from '@/features/auth';
import { useMe, useSports } from '@/features/profile';
import styles from './ProfilePage.module.css';

/** /perfil — resumo e atalhos. */
export function ProfilePage() {
  const me = useMe();
  const sports = useSports();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  const volley = sports.data?.find((s) => s.id === 'volleyball');
  const profile = me.data?.sportProfiles.find((p) => p.sportId === 'volleyball');
  const positions = profile?.positions.map((id) => volley?.positions.find((p) => p.id === id)?.label ?? id).join(', ');
  const level = volley?.levels.find((l) => l.value === profile?.level)?.label;

  const onSignOut = async () => {
    setLeaving(true);
    await signOut(queryClient);
    navigate('/entrar', { replace: true });
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Perfil" />

      <section className={styles.card} aria-label="Seu perfil">
        {me.data ? (
          <>
            <Avatar id={me.data.id} name={me.data.name} src={me.data.photoUrl} size="lg" decorative />
            <div className={styles.identity}>
              <p className={styles.name}>{me.data.name}</p>
              <p className={styles.nickname}>@{me.data.nickname}</p>
              {profile && (
                <p className={styles.sport}>
                  Vôlei{positions ? ` · ${positions}` : ''}
                  {level ? ` · ${level}` : ''}
                </p>
              )}
            </div>
          </>
        ) : (
          <Skeleton shape="card" height="8rem" />
        )}
      </section>

      <List label="Opções do perfil">
        <ListItem
          to="/perfil/dados"
          leading={<UserRound aria-hidden="true" />}
          title="Seus dados"
          meta="Nome, nickname, posições e nível"
        />
        <ListItem
          to="/perfil/preferencias"
          leading={<Settings aria-hidden="true" />}
          title="Preferências"
          meta="Tema e instalação do app"
        />
        <ListItem
          to="/perfil/historico"
          leading={<History aria-hidden="true" />}
          title="Histórico"
          meta="Suas partidas e pagamentos"
        />
        <ListItem
          to="/perfil/privacidade"
          leading={<ShieldCheck aria-hidden="true" />}
          title="Privacidade e conta"
          meta="Termos, baixar dados, excluir conta"
        />
      </List>

      <Button
        variant="outline"
        block
        icon={<LogOut size={20} aria-hidden="true" />}
        loading={leaving}
        onClick={() => void onSignOut()}
      >
        Sair
      </Button>
    </div>
  );
}
