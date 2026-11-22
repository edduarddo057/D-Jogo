type LockableOrientation = ScreenOrientation & {
  lock?: (o: 'portrait' | 'any') => Promise<void>;
  unlock?: () => void;
};

const orientation = () =>
  (typeof screen !== 'undefined' ? screen.orientation : undefined) as LockableOrientation | undefined;

/**
 * Trava a rotação em pé quando o aparelho deixa (Android com o app instalado ou em tela cheia).
 * O iPhone não deixa: lá quem garante é a tela "Gire o celular" (app/layouts/OrientationGuard).
 */
export function lockPortrait() {
  void orientation()
    ?.lock?.('portrait')
    .catch(() => undefined);
}

/**
 * Libera o celular deitado (só o placar do dia de jogo): marca `<html data-landscape="ok">`, que tira a
 * tela "Gire o celular", e destrava a rotação. Devolve a função que volta a travar em pé.
 */
export function allowLandscape() {
  document.documentElement.dataset.landscape = 'ok';
  const o = orientation();
  void o?.lock?.('any').catch(() => o.unlock?.());
  return () => {
    delete document.documentElement.dataset.landscape;
    lockPortrait();
  };
}
