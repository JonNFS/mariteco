import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Quais dados a Mariteco coleta, para que usa e como você pode exercer seus direitos (LGPD).',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="30/10/2026">
      <p>
        A <strong>{SITE.name}</strong> ({SITE.address.line1}, {SITE.address.neighborhood}, {SITE.address.city}/{SITE.address.state}) é a responsável (controladora) pelos dados pessoais tratados neste site, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Coletamos apenas o necessário para você comprar e receber seus pedidos.
      </p>

      <h2>1. Quais dados coletamos</h2>
      <table>
        <thead><tr><th>Dado</th><th>Para quê</th><th>Quando</th></tr></thead>
        <tbody>
          <tr><td>Nome, e-mail e senha</td><td>Criar e proteger sua conta (a senha é guardada de forma criptografada, nunca em texto)</td><td>Cadastro</td></tr>
          <tr><td>Dados da conta Google (nome e e-mail)</td><td>Entrar com o Google, sem criar senha</td><td>Login com Google</td></tr>
          <tr><td>WhatsApp / telefone</td><td>Avisar sobre seu pedido e falar com você sobre a entrega</td><td>Cadastro e compra</td></tr>
          <tr><td>Endereço de entrega (rua, número, bairro, cidade, UF, CEP) e nome de quem recebe</td><td>Calcular o frete e entregar</td><td>Compra</td></tr>
          <tr><td>Histórico de pedidos (itens, valores, entrega, cupom usado)</td><td>Mostrar “Meus pedidos”, suporte, garantia e obrigações fiscais</td><td>Compra</td></tr>
          <tr><td>Dados do presente (nome de quem envia, de quem recebe e recado)</td><td>Montar a embalagem e o cartão de presente</td><td>Se você escolher presente</td></tr>
          <tr><td>CPF</td><td>Exigido pelo meio de pagamento (Pix, boleto e cartão). É enviado ao Mercado Pago e <strong>não é armazenado</strong> pela loja</td><td>Pagamento</td></tr>
          <tr><td>Dados de pagamento (forma, status, parcelas, identificador da transação)</td><td>Confirmar o pagamento e conciliar pedidos. <strong>O número do cartão não passa pelo nosso site nem fica guardado conosco</strong>: é digitado em um formulário seguro do Mercado Pago</td><td>Pagamento</td></tr>
          <tr><td>Dados técnicos (endereço IP, navegador, registros de acesso) e identificadores de segurança antifraude</td><td>Segurança do site, prevenção a fraude e funcionamento</td><td>Navegação e pagamento</td></tr>
          <tr><td>Cookies essenciais</td><td>Manter você logado e proteger a sessão. Não usamos cookies de publicidade</td><td>Navegação</td></tr>
        </tbody>
      </table>
      <p>Não coletamos dados sensíveis (como saúde, religião ou biometria). Dados de crianças só são tratados quando informados por um responsável, para entrega de presentes.</p>

      <h2>2. Bases legais</h2>
      <ul>
        <li>Execução de contrato: processar e entregar sua compra e manter sua conta.</li>
        <li>Cumprimento de obrigação legal: registros fiscais e de pedidos.</li>
        <li>Legítimo interesse: segurança do site e prevenção a fraudes.</li>
        <li>Consentimento: quando exigido (por exemplo, avisos por WhatsApp). Você pode retirá-lo a qualquer momento.</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <p>Compartilhamos somente com quem precisa para o serviço funcionar (operadores):</p>
      <ul>
        <li><strong>Supabase</strong>: banco de dados, autenticação e armazenamento.</li>
        <li><strong>Vercel</strong>: hospedagem do site.</li>
        <li><strong>Mercado Pago</strong>: processamento de pagamentos (Pix, cartão e boleto).</li>
        <li><strong>Google</strong>: login com o Google.</li>
        <li><strong>Resend</strong>: envio de e-mails sobre o pedido.</li>
        <li><strong>Meta (WhatsApp)</strong>: envio de mensagens sobre o pedido.</li>
        <li><strong>Transportadoras/Correios</strong>: nome, endereço e telefone para entregar.</li>
      </ul>
      <p>Não vendemos seus dados. Alguns desses serviços podem armazenar dados fora do Brasil, com as garantias previstas na LGPD.</p>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>Dados da conta, enquanto ela existir. Pedidos e dados fiscais, pelo prazo exigido em lei (em regra, 5 anos). Depois disso, apagamos ou anonimizamos.</p>

      <h2>5. Seus direitos</h2>
      <p>Você pode, a qualquer momento: confirmar que tratamos seus dados, acessá-los, corrigi-los, pedir anonimização ou exclusão, solicitar portabilidade, saber com quem compartilhamos e retirar o consentimento. Chame a gente pelo <a href={whatsappLink('Olá! Quero exercer meus direitos de dados (LGPD).')} target="_blank" rel="noopener noreferrer">WhatsApp {SITE.phoneDisplay}</a> ou presencialmente na loja. Responderemos em até 15 dias.</p>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), controle de acesso por conta, validação de todos os valores no servidor e senhas protegidas. Nenhum sistema é 100% imune, mas trabalhamos para reduzir riscos e avisaremos você e a ANPD em caso de incidente relevante.</p>

      <h2>7. Alterações</h2>
      <p>Podemos atualizar esta política. A data da última atualização fica no topo da página.</p>
    </LegalPage>
  );
}
