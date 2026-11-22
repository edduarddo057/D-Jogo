import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';
import styles from './InviteQr.module.css';

/** QR Code do link (a biblioteca só é baixada quando a pessoa pede o QR). */
export function InviteQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void import('uqr').then(({ renderSVG }) => {
      if (!alive) return;
      const svg = renderSVG(url, { ecc: 'M', border: 2, pixelSize: 8, blackColor: '#141416', whiteColor: '#ffffff' });
      setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <figure className={styles.qr}>
      {src ? (
        <img src={src} alt="QR Code do convite" width={224} height={224} />
      ) : (
        <Skeleton shape="card" width="22.4rem" height="22.4rem" />
      )}
      <figcaption className={styles.caption}>Aponte a câmera do celular para entrar na turma.</figcaption>
    </figure>
  );
}
