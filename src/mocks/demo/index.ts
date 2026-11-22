import type { SetupWorker } from 'msw/browser';
import { DEMO_DB_KEY } from '@/lib/demo';
import { currentSeq, db as liveDb, replaceDb, type Db } from '../db';
import { createDemoDb } from './seed';

interface Saved {
  seq: number;
  db: Omit<Db, 'otp'>;
}

/** Banco da demo guardado no aparelho (sem os códigos de verificação, que não fazem sentido aqui). */
export function loadDemoDb(): Db | null {
  try {
    const raw = localStorage.getItem(DEMO_DB_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    replaceDb({ ...saved.db, otp: new Map() }, saved.seq);
    return saved.db as Db;
  } catch {
    return null; // guardado corrompido: começa de novo
  }
}

export function saveDemoDb(db: Db) {
  const { otp: _otp, ...rest } = db;
  const saved: Saved = { seq: currentSeq(), db: rest };
  try {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(saved));
  } catch {
    /* sem espaço no aparelho: a demo segue, só não guarda */
  }
}

/**
 * Liga o banco da demo: retoma o que ficou salvo ou cria a turma pronta, e salva de novo depois de
 * cada alteração (respostas a POST/PUT/PATCH/DELETE), com um pequeno atraso para juntar toques seguidos.
 */
export function startDemoDb(worker: SetupWorker) {
  if (!loadDemoDb()) {
    replaceDb(createDemoDb());
    saveDemoDb(liveDb);
  }
  let timer: number | undefined;
  worker.events.on('response:mocked', ({ request }) => {
    if (request.method === 'GET') return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => saveDemoDb(liveDb), 150);
  });
}
