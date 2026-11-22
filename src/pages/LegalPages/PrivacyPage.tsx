import { Link } from 'react-router';
import { PRIVACY_CONTACT } from '@/lib/config';
import { LegalDocument } from './LegalDocument';
import styles from './LegalPages.module.css';

/** /privacidade — política de privacidade (LGPD; minuta para revisão jurídica). */
export function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidade">
      <p>
        Coletamos só o necessário para o Dá Jogo funcionar. Esta política explica quais dados usamos, por quê, com quem
        compartilhamos e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h2>Quais dados usamos e por quê</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Dados, finalidade e base legal</caption>
          <thead>
            <tr>
              <th scope="col">Dado</th>
              <th scope="col">Para quê</th>
              <th scope="col">Base legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Celular</td>
              <td>Entrar na conta (código) e o organizador da turma falar com você</td>
              <td>Execução do contrato</td>
            </tr>
            <tr>
              <td>Nome e apelido</td>
              <td>Identificar você nas turmas, listas e times</td>
              <td>Execução do contrato</td>
            </tr>
            <tr>
              <td>Posições e nível</td>
              <td>Montar times equilibrados</td>
              <td>Execução do contrato</td>
            </tr>
            <tr>
              <td>Presenças, fila e times</td>
              <td>Organizar os jogos e mostrar seu histórico</td>
              <td>Execução do contrato</td>
            </tr>
            <tr>
              <td>Avisos e validações de pagamento</td>
              <td>Controle de quem pagou, feito pelo organizador</td>
              <td>Execução do contrato</td>
            </tr>
            <tr>
              <td>Registros de acesso (data, hora, IP)</td>
              <td>Segurança e cumprimento do Marco Civil da Internet</td>
              <td>Obrigação legal</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Não coletamos dados bancários: o Pix é feito no app do seu banco, para a chave do organizador. Não vendemos
        dados e não usamos seus dados para publicidade.
      </p>

      <h2>Quem vê o quê</h2>
      <ul>
        <li>
          Pessoas das suas turmas veem seu nome, apelido, posições e sua situação nos jogos. Nível e gênero só quem
          organiza vê.
        </li>
        <li>Só o organizador vê seu telefone e o status dos seus pagamentos naquela turma.</li>
        <li>
          Quem não está na turma não vê nada dela. Um link de convite mostra só o nome, o local e a próxima partida.
        </li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>Provedor de SMS/WhatsApp, só para enviar o código de acesso.</li>
        <li>Provedores de hospedagem e banco de dados que operam o serviço para nós, sob contrato.</li>
        <li>Autoridades, quando a lei exigir.</li>
      </ul>

      <h2>No seu aparelho</h2>
      <p>
        O app guarda no navegador só o necessário: sua preferência de tema e informações temporárias do login. A sessão
        usa um cookie seguro de acesso. Não usamos cookies de rastreamento nem de anúncios.
      </p>

      <h2>Por quanto tempo</h2>
      <ul>
        <li>Enquanto sua conta existir.</li>
        <li>Ao excluir a conta, apagamos nome, foto e telefone; seu nome passa a aparecer como “Jogador removido”.</li>
        <li>Registros de acesso ficam guardados por 6 meses, como exige o Marco Civil da Internet.</li>
      </ul>

      <h2>Seus direitos</h2>
      <p>Pela LGPD, você pode a qualquer momento:</p>
      <ul>
        <li>
          ver e baixar seus dados, e corrigir o que estiver errado — em <Link to="/voce/ajustes">Perfil › Ajustes</Link>{' '}
          e <Link to="/voce">Perfil › Editar</Link>;
        </li>
        <li>excluir sua conta, no mesmo lugar;</li>
        <li>saber com quem compartilhamos seus dados e revogar consentimentos;</li>
        <li>reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>

      <h2>Fale com a gente</h2>
      <p>
        Encarregado de dados: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. Respondemos em até 15 dias.
      </p>
    </LegalDocument>
  );
}
