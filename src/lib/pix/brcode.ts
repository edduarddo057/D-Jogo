/**
 * Código Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central).
 * Valor e chave vão juntos: a pessoa só cola no app do banco.
 */
export interface BrCodeInput {
  key: string;
  /** Centavos; sem valor, o banco pede para digitar. */
  amountCents?: number;
  merchantName: string;
  merchantCity?: string;
  /** Identificador do pagamento (até 25 letras e números). */
  txid?: string;
  description?: string;
}

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** Sem acento e só os caracteres que o padrão aceita. */
const clean = (text: string, max: number) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .@_-]/g, '')
    .trim()
    .slice(0, max);

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como pede o BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildBrCode(input: BrCodeInput): string {
  const account =
    field('00', 'br.gov.bcb.pix') +
    field('01', input.key.trim()) +
    (input.description ? field('02', clean(input.description, 40)) : '');
  const txid = clean(input.txid ?? '***', 25).replace(/[^A-Za-z0-9*]/g, '') || '***';
  const payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (input.amountCents ? field('54', (input.amountCents / 100).toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', clean(input.merchantName, 25) || 'DA JOGO') +
    field('60', clean(input.merchantCity ?? 'SAO PAULO', 15) || 'SAO PAULO') +
    field('62', field('05', txid)) +
    '6304';
  return payload + crc16(payload);
}
