import { Link } from 'react-router';
import { LegalDocument } from './LegalDocument';

/** /termos — termos de uso (minuta para revisão jurídica). */
export function TermsPage() {
  return (
    <LegalDocument title="Termos de uso">
      <p>
        O Dá Jogo ajuda grupos de pessoas a organizar partidas esportivas: turmas, presença, vagas, lista de espera,
        pagamentos entre os participantes e sorteio de times. Ao criar sua conta, você concorda com estes termos e com a{' '}
        <Link to="/privacidade">política de privacidade</Link>.
      </p>

      <h2>1. Sua conta</h2>
      <ul>
        <li>A conta é pessoal e usa o seu número de celular, confirmado por um código enviado por SMS ou WhatsApp.</li>
        <li>Você precisa ter 18 anos ou mais, ou usar o app com autorização do seu responsável legal.</li>
        <li>
          Mantenha seus dados corretos. Nome, nickname, posições e nível aparecem para as pessoas das suas turmas.
        </li>
      </ul>

      <h2>2. Turmas e organizadores</h2>
      <ul>
        <li>Quem cria uma turma é o organizador e responde pelas regras, valores e convites daquela turma.</li>
        <li>O organizador define vagas, prazos, lista de espera e padrões de sorteio, e pode remover participantes.</li>
        <li>
          O organizador vê o telefone dos participantes da turma para combinar o jogo; os outros jogadores não veem.
        </li>
      </ul>

      <h2>3. Pagamentos</h2>
      <ul>
        <li>
          Os pagamentos (mensalidades e partidas avulsas) são feitos <strong>diretamente</strong> ao organizador, pelo
          Pix ou outro meio combinado. O Dá Jogo não recebe, não guarda e não intermedeia dinheiro.
        </li>
        <li>O app registra o aviso de pagamento e a validação feita pelo organizador, para que todos acompanhem.</li>
        <li>Reembolsos, desistências e cancelamentos seguem o que a turma combinar com o organizador.</li>
      </ul>

      <h2>4. Uso adequado</h2>
      <ul>
        <li>Não use o app para enviar conteúdo ofensivo, discriminatório, enganoso ou ilegal.</li>
        <li>Não tente acessar dados de outras pessoas ou atrapalhar o funcionamento do serviço.</li>
        <li>Podemos suspender contas que descumpram estes termos, avisando sempre que possível.</li>
      </ul>

      <h2>5. O serviço</h2>
      <ul>
        <li>Trabalhamos para o app funcionar bem, mas ele pode ter falhas ou ficar fora do ar em manutenções.</li>
        <li>
          O Dá Jogo não organiza as partidas nem responde por acidentes, lesões ou combinados entre os participantes.
        </li>
        <li>Podemos mudar estes termos. Se a mudança for importante, pediremos um novo aceite no app.</li>
      </ul>

      <h2>6. Encerrar a conta</h2>
      <p>
        Você pode excluir sua conta quando quiser em Perfil › Privacidade e conta. Quem organiza turmas com
        participantes precisa arquivá-las antes.
      </p>

      <h2>7. Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a LGPD.</p>
    </LegalDocument>
  );
}
