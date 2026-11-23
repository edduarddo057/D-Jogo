import { Stepper } from '@/components/Stepper';
import { useSports } from '../../queries/useProfileQueries';
import type { SkillScores } from '../../utils/skills';
import styles from './SkillsEditor.module.css';

export interface SkillsEditorProps {
  sportId: string;
  value: SkillScores;
  onChange: (value: SkillScores) => void;
}

/**
 * Notas de 1 a 10 nos fundamentos da modalidade (RN-17a): uma linha por fundamento. "–" = sem nota
 * (conta como o nível geral × 2 no sorteio). Modalidade sem fundamentos: não mostra nada.
 */
export function SkillsEditor({ sportId, value, onChange }: SkillsEditorProps) {
  const sports = useSports();
  const skills = sports.data?.find((s) => s.id === sportId)?.skills ?? [];
  if (skills.length === 0) return null;
  return (
    <div className={styles.list} role="group" aria-label="Fundamentos, de 1 a 10">
      {skills.map((k) => (
        <div key={k.id} className={styles.row}>
          <span className={styles.label}>{k.label}</span>
          <Stepper
            label={k.label}
            value={value[k.id] ?? 0}
            min={0}
            max={10}
            format={(n) => (n === 0 ? '–' : String(n))}
            // do "–" (sem nota) o primeiro toque em + já vai para 5, o meio da escala
            onChange={(n) => onChange({ ...value, [k.id]: n === 0 ? null : (value[k.id] ?? null) === null ? 5 : n })}
          />
        </div>
      ))}
    </div>
  );
}
