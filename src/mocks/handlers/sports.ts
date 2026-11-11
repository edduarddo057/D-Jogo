import { http, HttpResponse } from 'msw';
import type { Schema } from '@/lib/http';
import { api } from '../utils';

export const SPORTS: Schema<'Sport'>[] = [
  {
    id: 'volleyball',
    name: 'Vôlei',
    defaultTeamSize: 6,
    positions: [
      { id: 'setter', label: 'Levantador(a)', short: 'LEV' },
      { id: 'outside', label: 'Ponteiro(a)', short: 'PON' },
      { id: 'opposite', label: 'Oposto(a)', short: 'OPO' },
      { id: 'middle', label: 'Central', short: 'CEN' },
      { id: 'libero', label: 'Líbero', short: 'LÍB' },
    ],
    levels: [
      { value: 1, label: 'Iniciante' },
      { value: 2, label: 'Básico' },
      { value: 3, label: 'Intermediário' },
      { value: 4, label: 'Avançado' },
      { value: 5, label: 'Competitivo' },
    ],
  },
];

export const sportHandlers = [http.get(api('/sports'), () => HttpResponse.json({ items: SPORTS }))];
