-- =====================================================================
-- MARITECO — schema v2 (pagamentos, cupons, presente, mensagens)
-- Rode DEPOIS do schema.sql. Cole tudo no SQL Editor e clique em Run.
-- É idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERFIL: registro do aceite da política de privacidade / termos (LGPD)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists accepted_terms_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accepted timestamptz;
  v_phone text;
begin
  begin
    v_accepted := nullif(new.raw_user_meta_data->>'accepted_terms_at', '')::timestamptz;
  exception when others then
    v_accepted := null;
  end;
  v_phone := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), '');
  if v_phone is not null and char_length(v_phone) not between 10 and 13 then v_phone := null; end if;
  insert into public.profiles (id, full_name, phone, accepted_terms_at)
  values (new.id,
          nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
          v_phone,
          v_accepted)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DA LOJA (editáveis no admin)
-- ---------------------------------------------------------------------
create table if not exists public.store_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (key, value) values
  ('gift_wrap_price_cents', '0'::jsonb),       -- preço da embalagem de presente (0 = grátis)
  ('max_installments',      '3'::jsonb),       -- parcelas máximas no cartão (1 a 12)
  ('pix_expiration_minutes','60'::jsonb),      -- validade do Pix (30 a 1440)
  ('boleto_expiration_days','3'::jsonb)        -- validade do boleto (1 a 30)
on conflict (key) do nothing;

alter table public.store_settings enable row level security;
drop policy if exists settings_read on public.store_settings;
create policy settings_read on public.store_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin on public.store_settings;
create policy settings_admin on public.store_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.setting_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::int from public.store_settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------
-- CUPONS
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description         text,
  discount_type       text not null check (discount_type in ('percent','fixed','free_shipping')),
  value               int  not null default 0 check (value >= 0),   -- % (1-100) ou centavos; ignorado em free_shipping
  min_subtotal_cents  int  not null default 0 check (min_subtotal_cents >= 0),
  max_discount_cents  int  check (max_discount_cents is null or max_discount_cents > 0),
  max_uses            int  check (max_uses is null or max_uses > 0),          -- null = ilimitado
  uses_count          int  not null default 0,
  max_uses_per_user   int  check (max_uses_per_user is null or max_uses_per_user > 0), -- null = ilimitado
  starts_at           timestamptz,                                              -- null = já vale
  expires_at          timestamptz,                                              -- null = sem validade
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  constraint coupons_value_ok check (
    (discount_type = 'percent' and value between 1 and 100)
    or (discount_type = 'fixed' and value > 0)
    or (discount_type = 'free_shipping')
  ),
  constraint coupons_period_ok check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.coupon_redemptions (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  discount_cents int  not null,
  created_at     timestamptz not null default now()
);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
-- clientes NÃO enxergam cupons (a validação é feita no servidor); só admin
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists redemptions_read on public.coupon_redemptions;
create policy redemptions_read on public.coupon_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- PEDIDOS: presente, cupom, pagamento, previsão de entrega
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists discount_cents    int  not null default 0;
alter table public.orders add column if not exists gift_fee_cents    int  not null default 0;
alter table public.orders add column if not exists coupon_code       text;
alter table public.orders add column if not exists is_gift           boolean not null default false;
alter table public.orders add column if not exists gift_from         text;
alter table public.orders add column if not exists gift_to           text;
alter table public.orders add column if not exists gift_message      text;
alter table public.orders add column if not exists estimated_delivery date;
alter table public.orders add column if not exists payment_method    text;
alter table public.orders add column if not exists payment_status    text not null default 'pending';
alter table public.orders add column if not exists mp_order_id       text;
alter table public.orders add column if not exists payment_attempts  int  not null default 0;
alter table public.orders add column if not exists payment_expires_at timestamptz;
alter table public.orders add column if not exists pix_qr_code       text;
alter table public.orders add column if not exists pix_qr_base64     text;
alter table public.orders add column if not exists boleto_url        text;
alter table public.orders add column if not exists boleto_line       text;
alter table public.orders add column if not exists boleto_barcode    text;
alter table public.orders add column if not exists installments      int;
alter table public.orders add column if not exists paid_at           timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_method_chk') then
    alter table public.orders add constraint orders_payment_method_chk
      check (payment_method is null or payment_method in ('pix','credit_card','boleto'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_status_chk') then
    alter table public.orders add constraint orders_payment_status_chk
      check (payment_status in ('pending','approved','rejected','expired','cancelled','refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_total_chk') then
    alter table public.orders add constraint orders_total_chk
      check (total_cents = subtotal_cents + shipping_cents + gift_fee_cents - discount_cents);
  end if;
end $$;

create index if not exists orders_mp_order_idx on public.orders (mp_order_id) where mp_order_id is not null;
create index if not exists orders_pending_idx on public.orders (payment_expires_at) where status = 'aguardando_pagamento';

-- ---------------------------------------------------------------------
-- MENSAGENS (e-mail / WhatsApp) editáveis no admin + registro de envios
-- ---------------------------------------------------------------------
create table if not exists public.message_templates (
  key               text primary key check (key in ('order_created','order_paid','order_shipped')),
  label             text not null,
  email_subject     text not null,
  email_body        text not null,
  whatsapp_body     text not null,
  email_enabled     boolean not null default true,
  whatsapp_enabled  boolean not null default true,
  updated_at        timestamptz not null default now()
);

insert into public.message_templates (key, label, email_subject, email_body, whatsapp_body) values
('order_paid', 'Pedido confirmado (pagamento aprovado)',
 'Pedido #{pedido} confirmado — Mariteco 💙',
 E'Olá, {nome}!\n\nSeu pagamento foi aprovado e o pedido está confirmado 🎉\n\nPedido #{pedido}\nValor: {valor}\nProdutos:\n{produtos}\nTipo de entrega: {entrega}\nData prevista de entrega: {previsao}\n{presente}\nA Mariteco agradece a preferência 💙',
 E'Pedido #{pedido}\nValor: {valor}\nProdutos:\n{produtos}\nTipo de entrega: {entrega}\nData prevista de entrega: {previsao}\n\nA Mariteco agradece a preferência 💙'),
('order_created', 'Pedido recebido (aguardando pagamento — Pix/boleto)',
 'Recebemos seu pedido #{pedido} — falta só o pagamento',
 E'Olá, {nome}!\n\nRecebemos o seu pedido #{pedido} e reservamos os itens para você.\n\nValor: {valor}\nForma de pagamento: {pagamento}\nProdutos:\n{produtos}\n\nAssim que o pagamento for confirmado, avisamos por aqui. Você também pode acompanhar na sua conta: {link}\n\nMariteco 💙',
 E'Pedido #{pedido} recebido!\nValor: {valor}\nPagamento: {pagamento} (aguardando)\n\nAssim que confirmarmos o pagamento, avisamos por aqui.\nMariteco 💙'),
('order_shipped', 'Pedido enviado',
 'Seu pedido #{pedido} foi enviado 📦',
 E'Olá, {nome}!\n\nSeu pedido #{pedido} saiu para entrega.\nTipo de entrega: {entrega}\nPrevisão: {previsao}\nCódigo de rastreio: {rastreio}\n\nMariteco 💙',
 E'Seu pedido #{pedido} foi enviado 📦\nEntrega: {entrega}\nPrevisão: {previsao}\nRastreio: {rastreio}\n\nMariteco 💙')
on conflict (key) do nothing;

create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  event      text not null,
  channel    text not null check (channel in ('email','whatsapp')),
  status     text not null check (status in ('sent','failed','skipped')),
  detail     text,
  created_at timestamptz not null default now(),
  unique (order_id, event, channel)
);

alter table public.message_templates enable row level security;
alter table public.notification_log enable row level security;
drop policy if exists templates_admin on public.message_templates;
create policy templates_admin on public.message_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists notiflog_admin on public.notification_log;
create policy notiflog_admin on public.notification_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- CÁLCULO DE CUPOM (única fonte de verdade — usada na prévia e na compra)
-- ---------------------------------------------------------------------
create or replace function public.coupon_quote(p_user_id uuid, p_code text, p_subtotal int, p_shipping int)
returns table (coupon_id uuid, discount_cents int, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_used int;
  v_disc int;
begin
  select * into c from coupons where code = upper(trim(coalesce(p_code, '')));
  -- mensagem genérica: não revela se o código existe
  if not found
     or not c.active
     or (c.starts_at is not null and c.starts_at > now())
     or (c.expires_at is not null and c.expires_at <= now())
     or (c.max_uses is not null and c.uses_count >= c.max_uses) then
    return query select null::uuid, 0, 'Cupom inválido ou expirado.'::text;
    return;
  end if;

  if c.max_uses_per_user is not null then
    select count(*) into v_used from coupon_redemptions r where r.coupon_id = c.id and r.user_id = p_user_id;
    if v_used >= c.max_uses_per_user then
      return query select null::uuid, 0, 'Você já utilizou este cupom.'::text;
      return;
    end if;
  end if;

  if p_subtotal < c.min_subtotal_cents then
    return query select null::uuid, 0,
      ('Este cupom vale para pedidos a partir de R$ ' || replace(to_char(c.min_subtotal_cents / 100.0, 'FM999990.00'), '.', ','))::text;
    return;
  end if;

  if c.discount_type = 'percent' then
    v_disc := floor(p_subtotal * c.value / 100.0)::int;
  elsif c.discount_type = 'fixed' then
    v_disc := least(c.value, p_subtotal);
  else
    v_disc := greatest(p_shipping, 0);
  end if;
  if c.max_discount_cents is not null then v_disc := least(v_disc, c.max_discount_cents); end if;

  return query select c.id, greatest(v_disc, 0), null::text;
end;
$$;

-- ---------------------------------------------------------------------
-- LIBERAR PEDIDOS NÃO PAGOS (estoque volta, cupom volta)
-- ---------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pay    text;
  v_coupon uuid;
begin
  select status, payment_status into v_status, v_pay from orders where id = p_order_id for update;
  if v_status is null then raise exception 'Pedido não encontrado'; end if;
  if v_status = 'cancelado' then return; end if;
  if v_status in ('enviado','entregue') then raise exception 'Pedido já enviado não pode ser cancelado aqui'; end if;

  update product_variants v set stock = v.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.variant_id = v.id;

  select coupon_id into v_coupon from coupon_redemptions where order_id = p_order_id;
  if v_coupon is not null then
    update coupons set uses_count = greatest(uses_count - 1, 0) where id = v_coupon;
    delete from coupon_redemptions where order_id = p_order_id;
  end if;

  update orders
     set status = 'cancelado',
         payment_status = case when v_pay = 'pending' then 'cancelled' else v_pay end
   where id = p_order_id;
end;
$$;

create or replace function public.release_expired_orders(p_grace_minutes int default 15)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from orders
    where status = 'aguardando_pagamento'
      and payment_status in ('pending','rejected','expired')
      and payment_expires_at is not null
      and payment_expires_at + make_interval(mins => p_grace_minutes) < now()
    for update skip locked
  loop
    perform cancel_order(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- CRIAR PEDIDO (v2): preços, estoque, cupom e presente decididos AQUI
-- ---------------------------------------------------------------------
drop function if exists public.create_order(uuid, jsonb, text, text, int, int);

create or replace function public.create_order(
  p_user_id         uuid,
  p_address         jsonb,
  p_shipping_method text,
  p_shipping_name   text,
  p_shipping_cents  int,
  p_shipping_days   int,
  p_estimated_delivery date,
  p_coupon_code     text,
  p_gift_wrap       boolean,
  p_gift_from       text,
  p_gift_to         text,
  p_gift_message    text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal int := 0;
  v_count    int := 0;
  v_gift_fee int := 0;
  v_discount int := 0;
  v_coupon_id uuid;
  v_coupon_err text;
  v_max_disc int;
  v_code     text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  r          record;
begin
  if p_shipping_cents < 0 then raise exception 'MSG:Frete inválido'; end if;

  -- libera reservas vencidas antes de checar o estoque
  perform release_expired_orders();

  if p_gift_wrap then
    if char_length(coalesce(p_gift_from, '')) > 60 or char_length(coalesce(p_gift_to, '')) > 60
       or char_length(coalesce(p_gift_message, '')) > 200 then
      raise exception 'MSG:Texto do presente muito longo';
    end if;
    v_gift_fee := greatest(setting_int('gift_wrap_price_cents', 0), 0);
  end if;

  -- trava o estoque das variações da sacola (evita vender o mesmo item duas vezes)
  for r in
    select ci.quantity, v.size, v.stock, p.name, p.price_cents, p.active
    from cart_items ci
    join product_variants v on v.id = ci.variant_id
    join products p on p.id = v.product_id
    where ci.user_id = p_user_id
    for update of v
  loop
    if not r.active then raise exception 'MSG:Produto indisponível: %', r.name; end if;
    if r.stock < r.quantity then raise exception 'MSG:Estoque insuficiente para % (tam. %)', r.name, r.size; end if;
    v_count := v_count + 1;
    v_subtotal := v_subtotal + r.price_cents * r.quantity;
  end loop;

  if v_count = 0 then raise exception 'MSG:Sua sacola está vazia'; end if;

  if v_code is not null then
    perform 1 from coupons where code = v_code for update;   -- serializa o uso do cupom
    select q.coupon_id, q.discount_cents, q.error into v_coupon_id, v_discount, v_coupon_err
      from coupon_quote(p_user_id, v_code, v_subtotal, p_shipping_cents) q;
    if v_coupon_err is not null then raise exception 'MSG:%', v_coupon_err; end if;
    -- o total nunca fica abaixo de R$ 1,00 (mínimo para cobrar no gateway)
    v_max_disc := greatest(v_subtotal + p_shipping_cents + v_gift_fee - 100, 0);
    v_discount := least(v_discount, v_max_disc);
  end if;

  insert into orders (user_id, subtotal_cents, shipping_cents, gift_fee_cents, discount_cents, total_cents,
                      shipping_method, shipping_name, shipping_days, estimated_delivery, address,
                      coupon_code, is_gift, gift_from, gift_to, gift_message, payment_expires_at)
  values (p_user_id, v_subtotal, p_shipping_cents, v_gift_fee, v_discount,
          v_subtotal + p_shipping_cents + v_gift_fee - v_discount,
          p_shipping_method, p_shipping_name, p_shipping_days, p_estimated_delivery, p_address,
          case when v_coupon_id is not null then v_code end,
          coalesce(p_gift_wrap, false),
          case when p_gift_wrap then nullif(trim(p_gift_from), '') end,
          case when p_gift_wrap then nullif(trim(p_gift_to), '') end,
          case when p_gift_wrap then nullif(trim(p_gift_message), '') end,
          now() + interval '30 minutes')
  returning id into v_order_id;

  insert into order_items (order_id, product_id, variant_id, name, size, image_path, unit_price_cents, quantity)
  select v_order_id, p.id, v.id, p.name, v.size,
         (select pi.path from product_images pi where pi.product_id = p.id order by pi.position limit 1),
         p.price_cents, ci.quantity
  from cart_items ci
  join product_variants v on v.id = ci.variant_id
  join products p on p.id = v.product_id
  where ci.user_id = p_user_id;

  if v_coupon_id is not null then
    insert into coupon_redemptions (coupon_id, user_id, order_id, discount_cents)
    values (v_coupon_id, p_user_id, v_order_id, v_discount);
    update coupons set uses_count = uses_count + 1 where id = v_coupon_id;
  end if;

  update product_variants v set stock = v.stock - ci.quantity
  from cart_items ci
  where ci.variant_id = v.id and ci.user_id = p_user_id;

  delete from cart_items where user_id = p_user_id;
  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------
-- PAGAMENTO: iniciar tentativa e confirmar (atômicos)
-- ---------------------------------------------------------------------
create or replace function public.begin_payment_attempt(
  p_order_id uuid, p_user_id uuid, p_method text, p_expires_at timestamptz
) returns table (attempt int, total_cents int, number bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_method not in ('pix','credit_card','boleto') then raise exception 'MSG:Forma de pagamento inválida'; end if;
  return query
    update orders o
       set payment_attempts = o.payment_attempts + 1,
           payment_method   = p_method,
           payment_status   = 'pending',
           payment_expires_at = p_expires_at
     where o.id = p_order_id
       and o.user_id = p_user_id
       and o.status = 'aguardando_pagamento'
       and o.payment_status in ('pending','rejected')
    returning o.payment_attempts, o.total_cents, o.number;
end;
$$;

-- 'paid'    = esta chamada confirmou o pagamento (dispare as notificações)
-- 'already' = já estava pago
-- 'late'    = pagamento chegou depois do pedido cancelado (reembolsar manualmente)
create or replace function public.mark_order_paid(p_order_id uuid, p_mp_order_id text, p_installments int default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  select status into v_status from orders where id = p_order_id for update;
  if v_status is null then return 'missing'; end if;
  if v_status = 'aguardando_pagamento' then
    update orders
       set status = 'pago', payment_status = 'approved', paid_at = now(),
           mp_order_id = coalesce(p_mp_order_id, mp_order_id),
           installments = coalesce(p_installments, installments)
     where id = p_order_id;
    return 'paid';
  elsif v_status = 'cancelado' then
    update orders set payment_status = 'approved', paid_at = coalesce(paid_at, now()) where id = p_order_id;
    return 'late';
  end if;
  return 'already';
end;
$$;

-- ---------------------------------------------------------------------
-- PERMISSÕES: só o servidor (service_role) executa estas funções
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_order(uuid, jsonb, text, text, int, int, date, text, boolean, text, text, text)',
    'public.cancel_order(uuid)',
    'public.release_expired_orders(int)',
    'public.coupon_quote(uuid, text, int, int)',
    'public.begin_payment_attempt(uuid, uuid, text, timestamptz)',
    'public.mark_order_paid(uuid, text, int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

revoke all on function public.setting_int(text, int) from public, anon;
grant execute on function public.setting_int(text, int) to authenticated, service_role;
