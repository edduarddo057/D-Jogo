import { buildBrCode, crc16 } from './brcode';

describe('Pix copia e cola (BR Code)', () => {
  it('calcula o CRC16 do padrão', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('leva chave, valor e nome no payload e fecha com o CRC', () => {
    const code = buildBrCode({
      key: 'volei.sabado@dajogo.app',
      amountCents: 2500,
      merchantName: 'Marina Costa',
      txid: 'PAYDUDUSAB',
    });
    expect(code.startsWith('000201')).toBe(true);
    expect(code).toContain('br.gov.bcb.pix');
    expect(code).toContain('0123volei.sabado@dajogo.app');
    expect(code).toContain('540525.00');
    expect(code).toContain('5912Marina Costa');
    expect(code.slice(-8, -4)).toBe('6304');
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  });
});
