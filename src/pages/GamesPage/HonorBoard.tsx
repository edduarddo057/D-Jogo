import { Flame, Trophy, Volleyball, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { fromState } from '@/components/NavBar';
import { Medal, type MedalTone } from '../shared/Medal';
import styles from './HonorBoard.module.css';

export interface HonorBoardProps {
  matches: number;
  /** 0 a 1. */
  attendanceRate: number;
  highlights: number;
}

interface MedalItem {
  key: string;
  icon: LucideIcon;
  value: string;
  label: string;
  tone: MedalTone;
}

/** Título com o feito principal. */
function headline({ matches, highlights }: HonorBoardProps) {
  if (highlights > 0) return highlights === 1 ? 'Já foi destaque do dia!' : `${highlights}× destaque do dia!`;
  return matches === 1 ? 'Primeiro jogo na conta!' : `${matches} jogos na conta!`;
}

/** Incentivo curto, conforme o momento da pessoa. */
function cheer({ attendanceRate, highlights }: HonorBoardProps) {
  if (highlights > 0) return `Bora pela ${highlights + 1}ª?`;
  if (attendanceRate >= 0.8) return 'Presença de respeito.';
  return 'Vença rodadas e vire destaque.';
}

/**
 * Mural de honra (Jogos, só para quem já jogou): os números viram medalhas de pódio; um toque
 * abre as estatísticas completas. Destaque ainda
 * não conquistado aparece prateado e apagado, "a conquistar", para dar vontade.
 */
export function HonorBoard(props: HonorBoardProps) {
  const { matches, attendanceRate, highlights } = props;
  const id = useId();
  const pct = Math.round(attendanceRate * 100);
  const medals: MedalItem[] = [
    { key: 'jogos', icon: Volleyball, value: String(matches), label: matches === 1 ? 'jogo' : 'jogos', tone: 'green' },
    { key: 'presenca', icon: Flame, value: `${pct}%`, label: 'presença', tone: pct >= 50 ? 'bronze' : 'locked' },
    {
      key: 'destaque',
      icon: Trophy,
      value: highlights > 0 ? `${highlights}×` : '–',
      label: highlights > 0 ? 'destaque' : 'a conquistar',
      tone: highlights > 0 ? 'gold' : 'locked',
    },
  ];

  return (
    <section className={styles.board} aria-labelledby={`${id}-titulo`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Seu mural</span>
        <h2 id={`${id}-titulo`} className={styles.title}>
          {headline(props)} <span className={styles.cheer}>{cheer(props)}</span>
        </h2>
      </header>
      <dl className={styles.medals} aria-label="Seus números">
        {medals.map((m, i) => (
          <div key={m.key} className={styles.medal} style={{ animationDelay: `${i * 90}ms` }}>
            <dt className={styles.label}>{m.label}</dt>
            <dd className={styles.body}>
              <Medal icon={m.icon} tone={m.tone} />
              <span className={styles.value}>{m.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      {/* o toque em qualquer parte do mural abre as estatísticas (o link cobre o card) */}
      <Link to="/voce/estatisticas" state={fromState('/', 'Jogos')} className={styles.more}>
        <span className="visually-hidden">Ver estatísticas</span>
      </Link>
    </section>
  );
}
