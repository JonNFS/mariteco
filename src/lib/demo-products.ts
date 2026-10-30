import type { ProductFull } from './types';

const roupa = ['2', '4', '6', '8', '10', '12'];
const calcado = ['26', '27', '28', '29', '30', '31', '32'];

function make(
  slug: string,
  name: string,
  description: string,
  cat: [string, string],
  gender: ProductFull['gender'],
  sizeType: ProductFull['size_type'],
  price: number,
  compare: number | null,
  image: string,
  featured: boolean,
  order: number,
): ProductFull {
  const sizes = sizeType === 'calcado' ? calcado : roupa;
  return {
    id: `demo-${slug}`,
    slug,
    name,
    description,
    price_cents: price,
    compare_at_cents: compare,
    gender,
    size_type: sizeType,
    weight_grams: sizeType === 'calcado' ? 600 : 300,
    featured,
    created_at: new Date(2026, 9, 29 - order).toISOString(),
    category: { name: cat[0], slug: cat[1] },
    images: [{ path: image }],
    variants: sizes.map((s) => ({ id: `demo-${slug}-${s}`, size: s, stock: 5 })),
  };
}

/** Usado apenas quando o Supabase ainda não está configurado (modo demonstração). */
export const DEMO_PRODUCTS: ProductFull[] = [
  make('demo-conjunto-cerejas-marinho', 'Conjunto Cerejinhas Marinho',
    'Blusinha com mangas babadas e shorts de elástico na cintura, estampa de cerejinhas sobre fundo marinho. Tecido leve e confortável para brincar o dia todo.',
    ['Conjuntos', 'conjuntos'], 'menina', 'roupa', 12990, 15990, '/demo/conjunto-cerejas-marinho.webp', true, 1),
  make('demo-conjunto-cerejas-vermelho', 'Conjunto Cerejinhas Listrado',
    'Blusinha listrada vermelha com bordado de cerejas e shorts em linho com laço. Combina com sandália e lacinhos.',
    ['Conjuntos', 'conjuntos'], 'menina', 'roupa', 13990, null, '/demo/conjunto-cerejas-vermelho.webp', true, 2),
  make('demo-conjunto-frutas', 'Conjunto Frutinhas Coloridas',
    'Estampa listrada e frutas super coloridas. Vestidinho com babado nas mangas e shorts combinando — alegria em forma de roupa!',
    ['Conjuntos', 'conjuntos'], 'menina', 'roupa', 14990, null, '/demo/conjunto-frutas-coloridas.webp', true, 3),
  make('demo-sandalia-coracao', 'Sandália Coração Glitter',
    'Sandália com coração holográfico e fecho de velcro ajustável. Palmilha macia para os pezinhos.',
    ['Calçados', 'calcados'], 'menina', 'calcado', 11990, 13990, '/demo/sandalia-coracao-glitter.webp', true, 4),
  make('demo-conjunto-listrado-azul', 'Conjunto Listradinho Azul',
    'Cropped e saia-short com laço na cintura, listras azul bebê e branco. Elegante e delicado.',
    ['Conjuntos', 'conjuntos'], 'menina', 'roupa', 15990, 18990, '/demo/conjunto-listrado-azul.webp', false, 5),
  make('demo-blusa-peplum', 'Blusa Peplum Listrada',
    'Blusinha com babadinho e detalhe em renda na barra. Leve, fresquinha e cheia de charme.',
    ['Conjuntos', 'conjuntos'], 'menina', 'roupa', 8990, null, '/demo/blusa-peplum-listrada.webp', false, 6),
  make('demo-shorts-tactel', 'Shorts Tactel Básico',
    'Shorts com cordão e bolsos, bordado de cavalo-marinho. Ótimo para praia, piscina e dia a dia. Várias cores.',
    ['Shorts e Bermudas', 'shorts'], 'menino', 'roupa', 6990, null, '/demo/shorts-tactel.webp', false, 7),
  make('demo-camiseta-basica', 'Camiseta Básica Colorida',
    'Camiseta 100% algodão em cores vibrantes. Gola reforçada e toque macio. Combine com os shorts!',
    ['Camisetas', 'camisetas'], 'unissex', 'roupa', 4990, null, '/demo/camisetas-e-shorts.webp', false, 8),
];

export const DEMO_CATEGORIES = [
  { id: 'c1', name: 'Conjuntos', slug: 'conjuntos' },
  { id: 'c2', name: 'Vestidos', slug: 'vestidos' },
  { id: 'c3', name: 'Camisetas', slug: 'camisetas' },
  { id: 'c4', name: 'Shorts e Bermudas', slug: 'shorts' },
  { id: 'c5', name: 'Calçados', slug: 'calcados' },
  { id: 'c6', name: 'Acessórios', slug: 'acessorios' },
  { id: 'c7', name: 'Bebês', slug: 'bebes' },
];
