-- =====================================================================
-- MARITECO — produtos de EXEMPLO (opcional)
-- Rode DEPOIS do schema.sql. Usa as fotos que já vêm em /public/demo.
-- Para remover depois: delete from products where slug like 'demo-%';
-- =====================================================================

with cat as (select id, slug from public.categories),
ins as (
  insert into public.products (slug, name, description, category_id, gender, size_type, price_cents, compare_at_cents, weight_grams, featured)
  values
  ('demo-conjunto-cerejas-marinho', 'Conjunto Cerejinhas Marinho',
   'Blusinha com mangas babadas e shorts de elástico na cintura, estampa de cerejinhas sobre fundo marinho. Tecido leve e confortável para brincar o dia todo.',
   (select id from cat where slug='conjuntos'), 'menina', 'roupa', 12990, 15990, 350, true),
  ('demo-conjunto-cerejas-vermelho', 'Conjunto Cerejinhas Listrado',
   'Blusinha listrada vermelha com bordado de cerejas e shorts em linho com laço. Combina com sandália e lacinhos.',
   (select id from cat where slug='conjuntos'), 'menina', 'roupa', 13990, null, 350, true),
  ('demo-conjunto-frutas', 'Conjunto Frutinhas Coloridas',
   'Estampa listrada e frutas super coloridas. Vestidinho com babado nas mangas e shorts combinando — alegria em forma de roupa!',
   (select id from cat where slug='conjuntos'), 'menina', 'roupa', 14990, null, 380, true),
  ('demo-conjunto-listrado-azul', 'Conjunto Listradinho Azul',
   'Cropped e saia-short com laço na cintura, listras azul bebê e branco. Elegante e delicado.',
   (select id from cat where slug='conjuntos'), 'menina', 'roupa', 15990, 18990, 330, false),
  ('demo-blusa-peplum', 'Blusa Peplum Listrada',
   'Blusinha com babadinho e detalhe em renda na barra. Leve, fresquinha e cheia de charme.',
   (select id from cat where slug='conjuntos'), 'menina', 'roupa', 8990, null, 220, false),
  ('demo-sandalia-coracao', 'Sandália Coração Glitter',
   'Sandália com coração holográfico e fecho de velcro ajustável. Palmilha macia para os pezinhos.',
   (select id from cat where slug='calcados'), 'menina', 'calcado', 11990, 13990, 600, true),
  ('demo-shorts-tactel', 'Shorts Tactel Básico',
   'Shorts com cordão e bolsos, bordado de cavalo-marinho. Ótimo para praia, piscina e dia a dia. Várias cores.',
   (select id from cat where slug='shorts'), 'menino', 'roupa', 6990, null, 200, false),
  ('demo-camiseta-basica', 'Camiseta Básica Colorida',
   'Camiseta 100% algodão em cores vibrantes. Gola reforçada e toque macio. Combine com os shorts!',
   (select id from cat where slug='camisetas'), 'unissex', 'roupa', 4990, null, 180, false)
  on conflict (slug) do nothing
  returning id, slug
)
select count(*) as produtos_inseridos from ins;

-- Imagens (arquivos de /public/demo)
insert into public.product_images (product_id, path, position)
select p.id, v.path, 0
from (values
  ('demo-conjunto-cerejas-marinho',   '/demo/conjunto-cerejas-marinho.webp'),
  ('demo-conjunto-cerejas-vermelho',  '/demo/conjunto-cerejas-vermelho.webp'),
  ('demo-conjunto-frutas',            '/demo/conjunto-frutas-coloridas.webp'),
  ('demo-conjunto-listrado-azul',     '/demo/conjunto-listrado-azul.webp'),
  ('demo-blusa-peplum',               '/demo/blusa-peplum-listrada.webp'),
  ('demo-sandalia-coracao',           '/demo/sandalia-coracao-glitter.webp'),
  ('demo-shorts-tactel',              '/demo/shorts-tactel.webp'),
  ('demo-camiseta-basica',            '/demo/camisetas-e-shorts.webp')
) as v(slug, path)
join public.products p on p.slug = v.slug
where not exists (select 1 from public.product_images i where i.product_id = p.id);

-- Tamanhos e estoque
insert into public.product_variants (product_id, size, stock)
select p.id, s.size, 5
from public.products p
cross join lateral unnest(
  case when p.slug = 'demo-sandalia-coracao' then array['26','27','28','29','30','31','32']
       else array['2','4','6','8','10','12'] end
) as s(size)
where p.slug like 'demo-%'
on conflict (product_id, size) do nothing;
