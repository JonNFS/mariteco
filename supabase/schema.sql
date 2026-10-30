-- =====================================================================
-- MARITECO — schema do Supabase
-- Cole TUDO isto em: Supabase > SQL Editor > New query > Run
-- É seguro rodar mais de uma vez (idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PERFIS (1 por usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  cpf         text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função usada pelas políticas: o usuário logado é admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- CATÁLOGO
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  sort_order  int  not null default 0
);

create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null check (char_length(name) between 2 and 120),
  description          text not null default '' check (char_length(description) <= 4000),
  category_id          uuid references public.categories(id) on delete set null,
  gender               text not null default 'unissex' check (gender in ('menina','menino','unissex')),
  size_type            text not null default 'roupa'   check (size_type in ('roupa','calcado','unico')),
  price_cents          int  not null check (price_cents > 0),
  compare_at_cents     int  check (compare_at_cents is null or compare_at_cents > price_cents),
  weight_grams         int  not null default 300 check (weight_grams between 10 and 30000),
  active               boolean not null default true,
  featured             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (active, created_at desc);
create index if not exists products_category_idx on public.products (category_id);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  path        text not null,          -- caminho no bucket "product-images" (ou /demo/... para as fotos de exemplo)
  position    int  not null default 0
);
create index if not exists product_images_product_idx on public.product_images (product_id, position);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null check (char_length(size) between 1 and 12),
  stock       int  not null default 0 check (stock >= 0),
  unique (product_id, size)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- ENDEREÇOS, SACOLA, PEDIDOS
-- ---------------------------------------------------------------------
create table if not exists public.addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  recipient     text not null,
  cep           text not null check (cep ~ '^[0-9]{8}$'),
  street        text not null,
  number        text not null,
  complement    text,
  neighborhood  text not null,
  city          text not null,
  state         text not null check (char_length(state) = 2),
  created_at    timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id, created_at desc);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  quantity    int  not null default 1 check (quantity between 1 and 20),
  created_at  timestamptz not null default now(),
  unique (user_id, variant_id)
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  number           bigint generated always as identity,
  user_id          uuid not null references auth.users(id) on delete restrict,
  status           text not null default 'aguardando_pagamento'
                   check (status in ('aguardando_pagamento','pago','em_separacao','enviado','entregue','cancelado')),
  subtotal_cents   int  not null check (subtotal_cents >= 0),
  shipping_cents   int  not null check (shipping_cents >= 0),
  total_cents      int  not null check (total_cents >= 0),
  shipping_method  text not null,
  shipping_name    text not null,
  shipping_days    int  not null default 0,
  address          jsonb not null,   -- cópia do endereço no momento da compra
  payment_provider text,             -- preenchido na integração de pagamento
  payment_id       text,
  tracking_code    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  variant_id       uuid references public.product_variants(id) on delete set null,
  name             text not null,
  size             text not null,
  image_path       text,
  unit_price_cents int  not null check (unit_price_cents > 0),
  quantity         int  not null check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------
-- RLS (Row Level Security) — NADA é acessível sem política explícita
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses       enable row level security;
alter table public.cart_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;

-- profiles: cada um vê/edita o próprio (sem poder mudar o "role"); admin vê todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- impede escalar privilégio: só estas colunas podem ser alteradas pelo usuário
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, cpf) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- catálogo: público lê itens ativos; admin gerencia tudo
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated
  using (active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
drop policy if exists images_admin on public.product_images;
create policy images_admin on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
drop policy if exists variants_admin on public.product_variants;
create policy variants_admin on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- endereços e sacola: somente do dono
drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cart_own on public.cart_items;
create policy cart_own on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- pedidos: cliente só LÊ os seus. Criação é feita pela função create_order (servidor).
-- Admin lê todos e pode atualizar status/rastreio.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke update on public.orders from authenticated;
grant update (status, tracking_code) on public.orders to authenticated;

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- ---------------------------------------------------------------------
-- FUNÇÕES DE PEDIDO (somente service_role — chamadas pelo servidor do site)
-- Preços e estoque são lidos do banco; o cliente nunca decide valores.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_user_id        uuid,
  p_address        jsonb,
  p_shipping_method text,
  p_shipping_name  text,
  p_shipping_cents int,
  p_shipping_days  int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal int := 0;
  v_count    int := 0;
  r          record;
begin
  if p_shipping_cents < 0 then raise exception 'frete inválido'; end if;

  -- trava as linhas de estoque para evitar venda duplicada
  for r in
    select ci.id as cart_id, ci.quantity, v.id as variant_id, v.size, v.stock,
           p.id as product_id, p.name, p.price_cents, p.active,
           (select pi.path from product_images pi where pi.product_id = p.id order by pi.position limit 1) as image_path
    from cart_items ci
    join product_variants v on v.id = ci.variant_id
    join products p on p.id = v.product_id
    where ci.user_id = p_user_id
    for update of v
  loop
    if not r.active then raise exception 'Produto indisponível: %', r.name; end if;
    if r.stock < r.quantity then raise exception 'Estoque insuficiente para % (tam. %)', r.name, r.size; end if;
    v_count := v_count + 1;
    v_subtotal := v_subtotal + r.price_cents * r.quantity;
  end loop;

  if v_count = 0 then raise exception 'Sacola vazia'; end if;

  insert into orders (user_id, subtotal_cents, shipping_cents, total_cents,
                      shipping_method, shipping_name, shipping_days, address)
  values (p_user_id, v_subtotal, p_shipping_cents, v_subtotal + p_shipping_cents,
          p_shipping_method, p_shipping_name, p_shipping_days, p_address)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, variant_id, name, size, image_path, unit_price_cents, quantity)
  select v_order_id, p.id, v.id, p.name, v.size,
         (select pi.path from product_images pi where pi.product_id = p.id order by pi.position limit 1),
         p.price_cents, ci.quantity
  from cart_items ci
  join product_variants v on v.id = ci.variant_id
  join products p on p.id = v.product_id
  where ci.user_id = p_user_id;

  -- reserva o estoque
  update product_variants v set stock = v.stock - ci.quantity
  from cart_items ci
  where ci.variant_id = v.id and ci.user_id = p_user_id;

  delete from cart_items where user_id = p_user_id;
  return v_order_id;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  select status into v_status from orders where id = p_order_id for update;
  if v_status is null then raise exception 'Pedido não encontrado'; end if;
  if v_status = 'cancelado' then return; end if;
  if v_status in ('enviado','entregue') then raise exception 'Pedido já enviado não pode ser cancelado aqui'; end if;

  update product_variants v set stock = v.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.variant_id = v.id;

  update orders set status = 'cancelado' where id = p_order_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, int, int) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, int, int) to service_role;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order(uuid) to service_role;

-- ---------------------------------------------------------------------
-- STORAGE: bucket público de leitura; só ADMIN envia/altera/apaga imagens
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- CATEGORIAS INICIAIS
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, sort_order) values
  ('Conjuntos',  'conjuntos',  1),
  ('Vestidos',   'vestidos',   2),
  ('Camisetas',  'camisetas',  3),
  ('Shorts e Bermudas', 'shorts', 4),
  ('Calçados',   'calcados',   5),
  ('Acessórios', 'acessorios', 6),
  ('Bebês',      'bebes',      7)
on conflict (slug) do nothing;
