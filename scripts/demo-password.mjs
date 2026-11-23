// Gera a impressão digital (SHA-256) da senha do modo demonstração, para VITE_DEMO_PASSWORD_HASH.
// Uso: pnpm demo:senha "sua senha"   (a senha em si não vai para o código nem para o build)
import { createHash } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: pnpm demo:senha "sua senha"');
  process.exit(1);
}
const hash = createHash('sha256').update(password.trim()).digest('hex');
console.log(`VITE_DEMO_PASSWORD_HASH=${hash}`);
