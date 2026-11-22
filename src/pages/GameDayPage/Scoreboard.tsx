import { clsx } from 'clsx';
import { ArrowLeftRight, CloudOff, Lock, LockOpen } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { Button } from '@/components/Button';
import { teamColor, teamLetter, teamName, type GameDaySession } from '@/features/live';
import { allowLandscape } from '@/lib/orientation';
import { toast } from '@/stores';
import { TeamTag } from '../shared/TeamTag';
import styles from './Scoreboard.module.css';

export interface ScoreboardProps {
  session: GameDaySession;
  online: boolean;
  name: (id: string) => string;
  /** Posição curta ("Lev", "Cen") ao lado do nome, quando houver. */
  short: (id: string) => string;
  onAdd: (pos: 0 | 1) => void;
  onAssign: (pos: 0 | 1, userId: string) => void;
  onRemove: (pos: 0 | 1) => void;
  onSwap: () => void;
  onEnd: () => void;
}

/** Tela cheia do navegador, quando o aparelho deixa (no iPhone, só o app instalado abre sem a barra). */
function useFullscreen(active: boolean) {
  useEffect(() => {
    const doc = document as Document & { fullscreenEnabled?: boolean };
    if (!doc.fullscreenEnabled) return;
    if (active && !document.fullscreenElement)
      void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
    if (!active && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [active]);
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );
}

/**
 * Placar do dia de jogo em tela cheia e travado (manual 4.3): só o jogo na tela, sem barra nem etapas.
 * O +1 marca o ponto e abre, do lado do time, quem pode ter feito; o −1 desfaz o último ponto daquele
 * lado, inclusive de quem tinha recebido. Travado, o Voltar do aparelho não sai do placar.
 */
export function Scoreboard({
  session: s,
  online,
  name,
  short,
  onAdd,
  onAssign,
  onRemove,
  onSwap,
  onEnd,
}: ScoreboardProps) {
  const [locked, setLocked] = useState(true);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  useFullscreen(locked);
  // o placar é a única tela que pode ficar com o celular deitado
  useEffect(() => allowLandscape(), []);

  // travado: o Voltar do aparelho (ou qualquer navegação) não tira do placar
  const blocker = useBlocker(locked);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    blocker.reset();
    toast('O placar está travado. Toque no cadeado para destravar.');
  }, [blocker]);

  const d = s.draw;
  if (!d) return null;
  const sides: Array<0 | 1> = s.swapped ? [1, 0] : [0, 1];
  const tie = s.score[0] === s.score[1];
  const waiting = d.teams.map((_, i) => i).filter((i) => i !== s.court[0] && i !== s.court[1]);
  const pickingTeam = picking === null ? null : s.court[picking];

  return (
    <div className={styles.board}>
      {!online && (
        <p className={styles.offline} role="status">
          <CloudOff size={16} aria-hidden="true" /> Sem internet · o placar está salvo neste celular
        </p>
      )}
      <header className={styles.top}>
        <div className={styles.titles}>
          <h1 className={styles.round}>Rodada {s.rounds.length + 1}</h1>
          {waiting.length > 0 && (
            <p className={styles.muted}>Esperando: {waiting.map((i) => teamName(i)).join(', ')}</p>
          )}
        </div>
        <Button variant="secondary" size="sm" icon={<ArrowLeftRight size={16} aria-hidden="true" />} onClick={onSwap}>
          Trocar lados
        </Button>
        <button
          type="button"
          className={clsx(styles.lock, !locked && styles.unlocked)}
          aria-pressed={locked}
          aria-label={locked ? 'Destravar a tela' : 'Travar a tela'}
          onClick={() => setLocked((v) => !v)}
        >
          {locked ? <Lock size={20} aria-hidden="true" /> : <LockOpen size={20} aria-hidden="true" />}
        </button>
      </header>

      <div className={styles.sides}>
        {sides.map((pos, i) => {
          const idx = s.court[pos];
          return (
            <section
              key={pos}
              className={clsx(styles.side, i === 1 && styles.right)}
              style={{ background: teamColor(idx) }}
              aria-label={teamName(idx)}
            >
              <span className={styles.sideName}>
                <TeamTag index={idx} letter={teamLetter(idx)} size="md" /> {teamName(idx)}
              </span>
              <span
                className={styles.sideNum}
                aria-live="polite"
                aria-label={`${teamName(idx)}: ${s.score[pos]} pontos`}
              >
                {s.score[pos]}
              </span>
              <button
                type="button"
                className={styles.plus}
                aria-label={`Ponto para o ${teamName(idx)}`}
                onClick={() => {
                  onAdd(pos);
                  setPicking(pos);
                }}
              >
                +1
              </button>
              <button
                type="button"
                className={styles.minus}
                aria-label={`Tirar ponto do ${teamName(idx)}`}
                disabled={s.score[pos] === 0}
                onClick={() => onRemove(pos)}
              >
                −1
              </button>
            </section>
          );
        })}
      </div>

      <div className={styles.dock}>
        {tie ? (
          <Button block disabled>
            Empate não pode ser encerrado
          </Button>
        ) : (
          <Button block onClick={onEnd}>
            Encerrar rodada
          </Button>
        )}
      </div>

      {picking !== null && pickingTeam !== null && (
        <ScorerDrawer
          // abre do lado em que o time está na tela
          from={sides.indexOf(picking) === 0 ? 'left' : 'right'}
          teamIndex={pickingTeam}
          players={d.teams[pickingTeam] ?? []}
          points={s.scorers}
          name={name}
          short={short}
          onPick={(id) => {
            onAssign(picking, id);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

/**
 * Lista que vem da lateral com o time do ponto: um toque em quem fez. Os nomes ficam embaixo, perto do
 * polegar; "Ninguém" (ponto sem nome) fica em cima, pequeno, para não ser tocado sem querer.
 */
function ScorerDrawer({
  from,
  teamIndex,
  players,
  points,
  name,
  short,
  onPick,
  onClose,
}: {
  from: 'left' | 'right';
  teamIndex: number;
  players: string[];
  points: Record<string, number>;
  name: (id: string) => string;
  short: (id: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    // Toque fora da gaveta fecha (ponto sem nome); o equivalente de teclado é o Esc.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={clsx(styles.drawer, from === 'left' ? styles.fromLeft : styles.fromRight)}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // fecha só no fundo escuro, fora da gaveta: espaço vazio dentro dela não conta como "Ninguém"
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) onClose();
      }}
    >
      <div className={styles.drawerHead} style={{ background: teamColor(teamIndex) }}>
        <TeamTag index={teamIndex} letter={teamLetter(teamIndex)} size="md" />
        <span>
          <span id={`${id}-titulo`} className={styles.drawerTitle}>
            Ponto do {teamName(teamIndex)}
          </span>
          <span className={styles.drawerSub}>Quem fez?</span>
        </span>
        {/* de propósito longe do polegar: o normal é tocar em alguém */}
        <button type="button" className={styles.nobody} onClick={onClose}>
          Ninguém
        </button>
      </div>
      <ul className={styles.picks}>
        {players.map((p) => (
          <li key={p}>
            <button type="button" className={styles.pick} onClick={() => onPick(p)}>
              <span>
                {name(p)}
                {short(p) && <span className={styles.pickPos}> · {short(p)}</span>}
              </span>
              {(points[p] ?? 0) > 0 && <span className={styles.pickPts}>{points[p]}</span>}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
