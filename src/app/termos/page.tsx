import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

export const metadata: Metadata = { title: 'Termos de compra', description: 'Regras de compra, pagamento, entrega, trocas e cupons da Mariteco.' };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de compra" updated="30/10/2026">
      <h2>1. Produtos e preços</h2>
      <p>Os preços são em reais (R$) e valem no momento da compra. O valor final é sempre conferido e calculado pelo nosso servidor, e pode incluir frete, embalagem de presente e descontos. Fotos são ilustrativas; pequenas variações de cor podem ocorrer conforme a tela.</p>

      <h2>2. Pagamento</h2>
      <ul>
        <li><strong>Pix:</strong> aprovação na hora. O pedido fica reservado pelo prazo exibido na tela; passado o prazo sem pagamento, é cancelado.</li>
        <li><strong>Cartão de crédito:</strong> parcelamento conforme exibido no checkout. O pagamento é processado pelo Mercado Pago.</li>
        <li><strong>Boleto:</strong> a compensação pode levar até 2 dias úteis. O pedido só é preparado após a confirmação.</li>
      </ul>
      <p>O estoque é reservado durante o pagamento. Se o pagamento não for concluído no prazo, os itens voltam para a loja.</p>

      <h2>3. Entrega</h2>
      <p>O prazo mostrado é uma estimativa em dias úteis, contado a partir da confirmação do pagamento. Também há retirada na loja ({SITE.address.line1}, {SITE.address.neighborhood}, {SITE.address.city}/{SITE.address.state}). Confira o endereço informado: dados incorretos podem atrasar a entrega.</p>

      <h2>4. Presente</h2>
      <p>Na embalagem de presente, o recado e os nomes que você informar são impressos no cartão. Não use dados de terceiros sem autorização e evite informações sensíveis.</p>

      <h2>5. Cupons de desconto</h2>
      <p>Cupons têm regras próprias (validade, valor mínimo, limite de usos) e não são acumuláveis entre si. O valor total da compra nunca fica abaixo de R$ 1,00. Cupons podem ser cancelados em caso de uso indevido.</p>

      <h2>6. Arrependimento, trocas e devoluções</h2>
      <p>Pelo Código de Defesa do Consumidor, compras feitas pela internet podem ser canceladas em até <strong>7 dias corridos</strong> após o recebimento, com devolução do valor, desde que o produto esteja sem uso e com etiquetas. Para trocas por tamanho e produtos com defeito, fale com a gente pelo <a href={whatsappLink('Olá! Preciso de ajuda com uma troca/devolução.')} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>

      <h2>7. Privacidade</h2>
      <p>O tratamento dos seus dados está descrito na <Link href="/privacidade">Política de Privacidade</Link>.</p>

      <h2>8. Contato</h2>
      <p>{SITE.name} · {SITE.address.line1}, {SITE.address.neighborhood} · {SITE.address.city}/{SITE.address.state} · WhatsApp {SITE.phoneDisplay}.</p>
    </LegalPage>
  );
}
