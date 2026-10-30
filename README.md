# Mariteco — loja online de moda infantil

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Vercel

➡️ **Para colocar no ar, siga o [DEPLOY.md](./DEPLOY.md).**

## O que já tem

- Vitrine pública (home, catálogo com filtros, página de produto com galeria e grade de tamanhos) — sem precisar logar.
- **Comprar e calcular frete exigem login** → o visitante é levado para `/entrar` e volta para o produto depois.
- Cálculo de frete por CEP (estilo Mercado Livre: opções, prazo "Chegará entre…", grátis em destaque), com preenchimento do endereço pelo ViaCEP.
- Sacola, checkout, pedido registrado no Supabase (estoque reservado), "Minha conta" com histórico.
- Painel **/admin**: produtos (fotos, preço, peso, tamanhos/estoque de roupa e calçado, destaque, ocultar), pedidos (status, rastreio, WhatsApp do cliente).
- **v2:** checkout transparente em 3 passos (Pix, cartão e boleto via Mercado Pago, sem sair do site), embalagem de presente (De/Para), cupons configuráveis, avisos por e-mail/WhatsApp com texto editável, política de privacidade e termos.
- Botão flutuante de WhatsApp, Instagram e TikTok, endereço da loja.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev
```
Sem chaves, roda em modo demonstração (sem login/compra).

## Segurança (resumo)

| Tema | Como está tratado |
|---|---|
| Acesso aos dados | RLS ligado em todas as tabelas; cliente só lê/edita o que é seu; catálogo público só mostra itens ativos |
| Admin | `profiles.role` só muda por SQL no Supabase (coluna sem permissão de UPDATE para usuários); `/admin` confere no servidor **e** o RLS exige `is_admin()`; não-admin recebe 404 |
| Preços / pagamento | O navegador nunca envia preço: total, frete, desconto e estoque são calculados no banco (`create_order`); a cobrança usa o total do banco; o pagamento só é aprovado após consultar o Mercado Pago e conferir valor e referência; webhook com assinatura; cartão vira token direto no Mercado Pago |
| Valores do pedido | Preço, estoque e frete são recalculados **no servidor**; a função `create_order` só roda com a service role, nunca pelo navegador |
| Chave secreta | `SUPABASE_SERVICE_ROLE_KEY` só em código `server-only` |
| Sessão | `@supabase/ssr` + `getUser()` (validação no servidor) em proxy, páginas e actions |
| Entradas | Validação com Zod em todas as actions/APIs; `next` do login só aceita caminhos internos (sem open-redirect) |
| Login | Mensagem genérica de erro (não revela se o e-mail existe); senha ≥ 8 com letras e números |
| Upload | Bucket só aceita JPG/PNG/WEBP/AVIF até 5 MB; só admin envia/apaga |
| Navegador | CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy |
| Abuso | Limite de requisições em frete/CEP/pedido (em memória; trocar por Redis em escala) |

## Estrutura

```
supabase/schema_v2.sql   cupons, presente, pagamentos, mensagens (rode depois do schema.sql)
supabase/schema.sql      tabelas, RLS, funções de pedido, bucket de imagens
supabase/seed.sql        produtos de exemplo (opcional)
src/proxy.ts             renova a sessão e protege /checkout, /conta, /sacola, /pedido, /admin
src/lib/shipping.ts      cálculo de frete (trocar por Melhor Envio/Correios depois)
src/app/actions/         login, sacola, checkout, admin (Server Actions)
src/app/api/             /api/frete e /api/cep (exigem login)
src/app/admin/           painel administrativo
public/brand, public/demo  logo e fotos de exemplo
```
