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
  {
    id: 'futevolei',
    name: 'Futevôlei',
    defaultTeamSize: 2,
    positions: [
      { id: 'left', label: 'Esquerda', short: 'ESQ' },
      { id: 'right', label: 'Direita', short: 'DIR' },
    ],
    levels: [
      { value: 1, label: 'Iniciante' },
      { value: 2, label: 'Básico' },
      { value: 3, label: 'Intermediário' },
      { value: 4, label: 'Avançado' },
      { value: 5, label: 'Competitivo' },
    ],
  },
  {
    id: 'society',
    name: 'Futebol society',
    defaultTeamSize: 7,
    positions: [
      { id: 'goalkeeper', label: 'Goleiro(a)', short: 'GOL' },
      { id: 'defender', label: 'Zagueiro(a)', short: 'ZAG' },
      { id: 'fullback', label: 'Lateral', short: 'LAT' },
      { id: 'midfielder', label: 'Meia', short: 'MEI' },
      { id: 'forward', label: 'Atacante', short: 'ATA' },
    ],
    levels: [
      { value: 1, label: 'Iniciante' },
      { value: 2, label: 'Básico' },
      { value: 3, label: 'Intermediário' },
      { value: 4, label: 'Avançado' },
      { value: 5, label: 'Competitivo' },
    ],
  },
  {
    id: 'futsal',
    name: 'Futsal',
    defaultTeamSize: 5,
    positions: [
      { id: 'goalkeeper', label: 'Goleiro(a)', short: 'GOL' },
      { id: 'fixo', label: 'Fixo', short: 'FIX' },
      { id: 'ala', label: 'Ala', short: 'ALA' },
      { id: 'pivo', label: 'Pivô', short: 'PIV' },
    ],
    levels: [
      { value: 1, label: 'Iniciante' },
      { value: 2, label: 'Básico' },
      { value: 3, label: 'Intermediário' },
      { value: 4, label: 'Avançado' },
      { value: 5, label: 'Competitivo' },
    ],
  },
  {
    id: 'basketball',
    name: 'Basquete',
    defaultTeamSize: 5,
    positions: [
      { id: 'guard', label: 'Armador(a)', short: 'ARM' },
      { id: 'wing', label: 'Ala', short: 'ALA' },
      { id: 'center', label: 'Pivô', short: 'PIV' },
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
