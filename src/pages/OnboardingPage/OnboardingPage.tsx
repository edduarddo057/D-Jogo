import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { Dock } from '@/components/Dock';
import { NavBar, PageTitle } from '@/components/NavBar';
import { useInvitePreview } from '@/features/invites';
import { ProfileForm, useMe } from '@/features/profile';
import { useSessionStore } from '@/stores';

/** Entrar — seu perfil (manual 3.1, tela 4). Ao concluir, a pessoa já entra na turma e cai em Jogos. */
export function OnboardingPage() {
  const navigate = useNavigate();
  const me = useMe();
  const invite = useSessionStore((s) => s.pendingInviteCode);
  const preview = useInvitePreview(invite ?? '');
  const [busy, setBusy] = useState(false);
  const sportId = invite ? preview.data?.group.sportId : undefined;

  return (
    <>
      <NavBar back={{ to: '/entrar/codigo', label: 'Voltar' }} />
      <PageTitle title="Seu perfil" />
      {(!invite || !preview.isPending) && (
        <ProfileForm
          mode="onboarding"
          me={me.data}
          sportId={sportId}
          inviteCode={invite}
          formId="perfil"
          onBusyChange={setBusy}
          onDone={() => {
            useSessionStore.getState().setPendingInvite(null);
            navigate('/', { replace: true });
          }}
        />
      )}
      <Dock>
        <Button type="submit" form="perfil" block loading={busy}>
          {invite ? 'Concluir e entrar na turma' : 'Concluir'}
        </Button>
      </Dock>
    </>
  );
}
