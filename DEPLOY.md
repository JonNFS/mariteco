# Como colocar a Mariteco online (passo a passo)

Tempo estimado: 30–40 minutos. Você vai usar 3 serviços gratuitos para começar: **GitHub** (guarda o código), **Supabase** (banco de dados, login e fotos) e **Vercel** (coloca o site no ar).

> Dica: abra este arquivo ao lado enquanto faz. Marque cada passo concluído.

---

## 0. Antes de começar

- Tenha contas no [GitHub](https://github.com), [Supabase](https://supabase.com) e [Vercel](https://vercel.com). Na Vercel, entre com a conta do GitHub (facilita muito).
- **Ative a verificação em 2 etapas (2FA) nas três contas.** Quem controla essas contas controla a loja.
- (Opcional) Para testar no seu computador: Node.js 20 ou mais novo.

---

## 1. Criar o banco no Supabase

1. Em supabase.com → **New project**.
   - Nome: `mariteco`
   - Senha do banco: gere uma forte e **guarde no gerenciador de senhas**.
   - Região: **South America (São Paulo)**.
2. Espere o projeto terminar de criar (1–2 min).
3. Menu **SQL Editor → New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo**, cole e clique em **Run**. Deve aparecer "Success".
   - Isso cria as tabelas, as regras de segurança (RLS), a pasta de imagens (`product-images`) e as categorias.
5. (Opcional, recomendado para ver o site cheio) Faça o mesmo com `supabase/seed.sql` — cria 8 produtos de exemplo com as fotos que você enviou. Depois você apaga (passo 9).

## 2. Copiar as chaves do Supabase

Em **Project Settings → API** (ou **API Keys**) copie:

| O que | Onde vai usar | Segredo? |
|---|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` | não |
| **anon / publishable key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não (a proteção vem do RLS) |
| **service_role / secret key** | `SUPABASE_SERVICE_ROLE_KEY` | **SIM — nunca poste, nunca commite** |

## 3. (Opcional) Testar no seu computador

```bash
npm install
cp .env.example .env.local      # no Windows: copy .env.example .env.local
# abra o .env.local e preencha as 3 chaves do passo 2
npm run dev
```
Abra http://localhost:3000. Sem as chaves o site funciona em **modo demonstração** (vitrine com produtos de exemplo, sem login).

## 4. Enviar o código para o GitHub

1. No GitHub: **New repository** → nome `mariteco-loja` → **Private** → *não* marque README/.gitignore → Create.
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "Mariteco: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/mariteco-loja.git
git push -u origin main
```

> O arquivo `.env.local` **não sobe** (está no `.gitignore`). Confira no GitHub que não existe nenhum arquivo `.env` com chaves.

## 5. Publicar na Vercel

1. Vercel → **Add New… → Project** → escolha o repositório `mariteco-loja` → **Import**.
2. Framework: **Next.js** (já detecta sozinho).
3. Abra **Environment Variables** e crie (marque Production, Preview e Development):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role/secret key |
| `NEXT_PUBLIC_SITE_URL` | por enquanto `https://mariteco-loja.vercel.app` (ajuste no passo 6) |
| `NEXT_PUBLIC_WHATSAPP` | `558296332203` (**confira o número**, veja nota abaixo) |
| `STORE_ORIGIN_CEP` | `57081015` |
| `FREE_SHIPPING_THRESHOLD_CENTS` | `29900` (= frete grátis acima de R$ 299; `0` desativa) |

4. Clique em **Deploy**. Em ~2 minutos o site abre em `https://algo.vercel.app`.
5. **Velocidade:** Vercel → *Settings → Functions → Function Region* → escolha **São Paulo (gru1)**, perto do Supabase. Depois faça um *Redeploy*.

> **Nota do WhatsApp:** o número que você passou (`+55 82 9633-2203`) tem 8 dígitos depois do DDD. Celulares no Brasil têm 9 (`9XXXX-XXXX`). Se o botão abrir um número errado, corrija `NEXT_PUBLIC_WHATSAPP` (ex.: `5582996332203`) e o texto do rodapé em `src/lib/constants.ts` (`phoneDisplay`).

## 6. Ligar o login ao endereço do site (importante!)

Sem isso o login/cadastro não volta para o site.

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://SEU-SITE.vercel.app` (depois, seu domínio próprio).
   - **Redirect URLs:** adicione `https://SEU-SITE.vercel.app/**` e `http://localhost:3000/**`.
2. Na Vercel, ajuste `NEXT_PUBLIC_SITE_URL` para o endereço final e faça **Redeploy**.
3. Supabase → **Authentication → Sign In / Providers → Email**: deixe **Confirm email ligado** (recomendado — evita contas falsas).
4. **E-mails de confirmação:** o envio padrão do Supabase é limitado (poucos e-mails por hora) e serve só para testes. Antes de divulgar a loja, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (ex.: Resend, Brevo, Amazon SES — todos têm plano gratuito).
5. (Opcional) **Login com Google:** Google Cloud Console → *APIs e serviços → Credenciais → ID do cliente OAuth* (tipo Web). Em "URIs de redirecionamento" cole a *Callback URL* que o Supabase mostra em **Authentication → Providers → Google**. Copie o Client ID/Secret para lá e ative. Se não for usar, tudo bem: o botão só dá erro amigável.

## 7. Virar administradora

1. No site, clique em **Entrar → Criar conta** e cadastre seu e-mail (confirme o e-mail se pedir).
2. Supabase → **SQL Editor**, rode (trocando pelo seu e-mail):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'seu@email.com');
```

3. Atualize o site: aparece o botão **Admin** no topo (ou acesse `/admin`).

> Só dá para virar admin por aqui (SQL no Supabase). Nenhum cliente consegue se promover pelo site — a coluna `role` é protegida no banco.

## 8. Cadastrar os produtos

Admin → **Produtos → Novo produto**:

1. Nome, descrição, categoria, "Para" (menina/menino/unissex).
2. Preço (ex.: `89,90`) e, se quiser, o preço "de" (riscado, mostra o desconto).
3. **Peso** em gramas (usado no frete).
4. **Tamanhos e estoque:** escolha uma grade pronta (RN–G, 1–16, calçados 15–35…) ou adicione tamanhos manualmente; digite o estoque de cada um.
5. **Fotos:** *Enviar fotos* (até 8, 5 MB cada). A primeira é a capa; use as setinhas para reordenar.
6. Salvar. Aparece na loja na hora.

Em **Pedidos** você vê cada compra, chama o cliente no WhatsApp, muda o status e coloca código de rastreio.

## 9. Limpar os produtos de exemplo (se usou o seed)

```sql
delete from public.products where slug like 'demo-%';
```

## 10. Domínio próprio (ex.: mariteco.com.br)

Vercel → seu projeto → **Settings → Domains → Add** e siga as instruções de DNS. Depois repita o **passo 6** com o domínio novo (Site URL + Redirect URLs + `NEXT_PUBLIC_SITE_URL`).

---

## 11. Atualizar o banco para a v2 (pagamentos, cupons, presente)

Supabase → **SQL Editor → New query** → cole **todo** o `supabase/schema_v2.sql` → **Run**. (Rode o `schema.sql` antes, se ainda não rodou. O v2 pode ser rodado de novo sem problema.)
Isso cria: cupons, mensagens editáveis, configurações da loja, registro de avisos, campos de presente/pagamento e as funções seguras que calculam preço, desconto e estoque **no banco**.

## 12. Mercado Pago (Pix, cartão e boleto dentro do site)

1. Crie/entre na conta Mercado Pago da loja → **Seu negócio → Configurações → Credenciais** (ou mercadopago.com.br/developers → *Suas integrações* → **Criar aplicação**, tipo *Checkout transparente / Pagamentos online*).
2. Copie, **primeiro as credenciais de TESTE**: *Public Key* → `NEXT_PUBLIC_MP_PUBLIC_KEY`, *Access Token* → `MP_ACCESS_TOKEN` (**secreto**).
3. **Webhook:** na aplicação → *Webhooks → Configurar notificações* → URL de produção `https://SEU-SITE/api/webhooks/mercadopago`, evento **Order (Mercado Pago)** (tópico `order`). Salve e copie a **Assinatura secreta** → `MP_WEBHOOK_SECRET`.
4. Na Vercel adicione também `CRON_SECRET` (um texto longo aleatório). O `vercel.json` já agenda a limpeza diária de pedidos não pagos.
5. Faça **Redeploy** e teste com as contas/cartões de teste do Mercado Pago (documentação "Cartões de teste"). Confirme: Pix gera QR, boleto gera linha digitável, cartão aprova/recusa, e o pedido muda para **Pago** sozinho.
6. Só depois troque para as credenciais de **produção** e atualize o webhook de produção.

> **Confira no teste (não consegui validar sem a sua conta):** (a) o webhook responde 200 no painel ("Simular notificação"); se der 401, o formato da assinatura mudou — o site continua seguro porque o status também é consultado direto na API e a tela do Pix confere sozinha a cada 4 s; (b) abra o F12 → Console no checkout com cartão: se aparecer "Refused to … Content Security Policy", acrescente o domínio citado em `next.config.mjs` (variável `MP`); (c) a validade do Pix/boleto em *Configurações* do admin.

## 13. E-mails de pedido (Resend)

1. resend.com → crie conta → **Domains** → adicione seu domínio e crie os registros DNS indicados.
2. **API Keys** → crie → `RESEND_API_KEY`. `EMAIL_FROM` = `Mariteco <pedidos@seudominio.com.br>`.
3. Sem isso o site funciona normalmente, só não envia e-mail (fica registrado como "ignorado").

## 14. Aviso automático por WhatsApp (opcional)

A única forma **oficial** é a *WhatsApp Cloud API* da Meta, que **só permite mensagens iniciadas pela loja usando modelos pré-aprovados**. Por isso:

- Sem configurar nada: no admin → **Pedidos**, o botão **Enviar pelo WhatsApp** abre a conversa com o cliente já com o texto pronto (o que você editou em **Mensagens**). Você só toca em enviar.
- Automático: em business.facebook.com crie o app **WhatsApp**, adicione o número da loja, e crie 3 modelos (categoria *Utilidade*, idioma *Português (BR)*) com **5 variáveis**: `{{1}}` pedido, `{{2}}` valor, `{{3}}` produtos, `{{4}}` entrega, `{{5}}` previsão. Exemplo do corpo:
  `Pedido #{{1}} | Valor: {{2}} | Produtos: {{3}} | Tipo de entrega: {{4}} | Data prevista de entrega: {{5}} | A Mariteco agradece a preferência 💙`
  Depois de aprovados, preencha `WHATSAPP_TOKEN` (token permanente), `WHATSAPP_PHONE_ID` e `WHATSAPP_TEMPLATE_ORDER_PAID/CREATED/SHIPPED` com os nomes dos modelos. (O texto aprovado na Meta é o que o cliente recebe; mudar o texto exige nova aprovação. Os e-mails usam o texto editável do admin.)

## 15. Cupons, presente e configurações (admin)

- **Cupons:** Admin → Cupons → *Novo cupom* (porcentagem, valor fixo ou frete grátis; pedido mínimo; limite de usos total e por cliente; início e validade opcionais — vazio = sem validade).
- **Presente:** o cliente marca "Embalar para presente" no passo 2 e informa De/Para/recado. O pedido aparece destacado em **Pedidos**. O preço da embalagem fica em **Configurações** (0 = grátis).
- **Mensagens:** Admin → Mensagens (assunto/texto do e-mail e texto do WhatsApp, com prévia).
- **Política de privacidade e termos:** `/privacidade` e `/termos` (revise com seu contador/advogado e inclua CNPJ, se tiver).

## Checklist de segurança antes de divulgar

- [ ] 2FA ligado em GitHub, Supabase e Vercel.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` existe **só** na Vercel (nunca no código, nunca com `NEXT_PUBLIC_`).
- [ ] Supabase → *Table Editor*: todas as tabelas mostram **RLS enabled**.
- [ ] "Confirm email" ligado e SMTP próprio configurado.
- [ ] Teste completo com uma conta comum: criar conta → escolher tamanho → calcular frete → comprar → ver pedido.
- [ ] Teste de que uma conta comum **não** acessa `/admin` (deve dar "página não encontrada").
- [ ] Repositório do GitHub **privado** e sem arquivos `.env`.
- [ ] `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `CRON_SECRET` só na Vercel. Teste em modo TESTE antes de usar credenciais de produção.
- [ ] Teste: alterar o preço no F12 não muda o valor cobrado (o servidor ignora valores do navegador).
- [ ] Se alguma chave vazar: Supabase → *Settings → API* → gere uma nova e atualize na Vercel.

---

## Próximos passos (depois de no ar)

1. **Pagamento:** pronto na v2 (passo 12).
2. **Frete real:** hoje é uma **estimativa por tabela de regiões** (`src/lib/shipping.ts`), saindo de Maceió. Para valores reais dos Correios/transportadoras, troque o miolo de `calculateShipping` por Melhor Envio, Frenet ou Correios — o resto do site não muda.
3. **E-mails de pedido:** pronto na v2 (passo 13).
4. **Limite de requisições global** (hoje é em memória por instância): Upstash Redis.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Criei a conta mas o link do e-mail dá erro | Passo 6: Site URL / Redirect URLs |
| Não chega e-mail de confirmação | Limite do SMTP padrão → configurar SMTP próprio |
| "Falha no envio da imagem" no admin | Sua conta ainda não é admin (passo 7) ou o `schema.sql` não foi rodado inteiro |
| Foto não aparece no site | Bucket `product-images` não é público (rode o `schema.sql` de novo) |
| Site mostra "modo demonstração" | Variáveis de ambiente faltando na Vercel → adicionar e *Redeploy* |
| Mudei variável e nada mudou | Variáveis só valem após novo deploy |
