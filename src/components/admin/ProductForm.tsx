'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { saveProduct } from '@/app/actions/admin';
import { createClient } from '@/lib/supabase/client';
import { GENDERS, SIZE_PRESETS, SIZE_TYPES } from '@/lib/constants';
import { cn, productImageUrl } from '@/lib/utils';
import type { Category } from '@/lib/types';

export type ProductFormInitial = {
  id?: string;
  name: string;
  description: string;
  categoryId: string | null;
  gender: 'menina' | 'menino' | 'unissex';
  sizeType: 'roupa' | 'calcado' | 'unico';
  priceCents: number | null;
  compareAtCents: number | null;
  weightGrams: number;
  active: boolean;
  featured: boolean;
  variants: { size: string; stock: number }[];
  images: string[];
};

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX_MB = 5;

const toMoney = (c: number | null) => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','));
function parseMoney(s: string): number | null {
  const clean = s.trim().replace(/[R$\s]/g, '');
  if (!clean) return null;
  const n = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function ProductForm({ initial, categories }: { initial: ProductFormInitial; categories: Category[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? '');
  const [gender, setGender] = useState(initial.gender);
  const [sizeType, setSizeType] = useState(initial.sizeType);
  const [price, setPrice] = useState(toMoney(initial.priceCents));
  const [compare, setCompare] = useState(toMoney(initial.compareAtCents));
  const [weight, setWeight] = useState(String(initial.weightGrams));
  const [active, setActive] = useState(initial.active);
  const [featured, setFeatured] = useState(initial.featured);
  const [variants, setVariants] = useState(initial.variants);
  const [images, setImages] = useState(initial.images);
  const [customSize, setCustomSize] = useState('');

  const applyPreset = (key: string) => {
    const preset = SIZE_PRESETS[key];
    if (!preset) return;
    setVariants(preset.sizes.map((size) => variants.find((v) => v.size === size) ?? { size, stock: 1 }));
    if (key.startsWith('calcado')) setSizeType('calcado');
    else if (key === 'unico') setSizeType('unico');
    else setSizeType('roupa');
  };

  const addSize = () => {
    const s = customSize.trim().slice(0, 12);
    if (!s) return;
    if (variants.some((v) => v.size.toLowerCase() === s.toLowerCase())) return setCustomSize('');
    setVariants([...variants, { size: s, stock: 1 }]);
    setCustomSize('');
  };

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const room = 8 - images.length;
    if (room <= 0) return setError('Máximo de 8 imagens por produto.');
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const ext = EXT[file.type];
      if (!ext) { setError('Use imagens JPG, PNG, WEBP ou AVIF.'); continue; }
      if (file.size > MAX_MB * 1024 * 1024) { setError(`"${file.name}" passa de ${MAX_MB} MB.`); continue; }
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error: err } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
      if (err) setError('Falha no envio da imagem. Confira se sua conta é admin e se o bucket foi criado.');
      else added.push(path);
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const priceCents = parseMoney(price);
    if (!priceCents) return setError('Informe um preço válido (ex.: 89,90).');
    const compareAtCents = compare.trim() ? parseMoney(compare) : null;
    if (compare.trim() && !compareAtCents) return setError('Preço "de" inválido.');

    start(async () => {
      const r = await saveProduct({
        id: initial.id,
        name,
        description,
        categoryId: categoryId || null,
        gender,
        sizeType,
        priceCents,
        compareAtCents,
        weightGrams: Number(weight) || 300,
        active,
        featured,
        variants,
        images,
      });
      if (!r.ok) return setError(r.error);
      router.push('/admin/produtos');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">Informações</h2>
        <div>
          <label className="label" htmlFor="pname">Nome do produto</label>
          <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="Ex.: Conjunto Cerejinhas Marinho" />
        </div>
        <div>
          <label className="label" htmlFor="pdesc">Descrição</label>
          <textarea id="pdesc" className="input min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} placeholder="Tecido, caimento, cuidados de lavagem…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pcat">Categoria</label>
            <select id="pcat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pgen">Para</label>
            <select id="pgen" className="input" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ptype">Tipo de tamanho</label>
            <select id="ptype" className="input" value={sizeType} onChange={(e) => setSizeType(e.target.value as typeof sizeType)}>
              {SIZE_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">Preço e peso</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pprice">Preço (R$)</label>
            <input id="pprice" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="89,90" />
          </div>
          <div>
            <label className="label" htmlFor="pcmp">Preço “de” (opcional)</label>
            <input id="pcmp" className="input" inputMode="decimal" value={compare} onChange={(e) => setCompare(e.target.value)} placeholder="109,90" />
          </div>
          <div>
            <label className="label" htmlFor="pw">Peso (gramas)</label>
            <input id="pw" className="input" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/\D/g, ''))} placeholder="300" />
          </div>
        </div>
        <p className="text-xs text-ink-500">O peso é usado no cálculo do frete (roupa ≈ 200–400 g, calçado ≈ 500–700 g, já com embalagem).</p>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Tamanhos e estoque</h2>
          <select className="input !w-auto !py-2 text-sm" defaultValue="" onChange={(e) => { applyPreset(e.target.value); e.target.value = ''; }} aria-label="Usar grade pronta">
            <option value="" disabled>Usar grade pronta…</option>
            {Object.entries(SIZE_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
        </div>

        {variants.length === 0 && <p className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">Escolha uma grade pronta acima ou adicione tamanhos manualmente.</p>}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((v, i) => (
            <li key={v.size} className="flex items-center gap-2 rounded-2xl border-2 border-ink-100 bg-white p-2 pl-4">
              <span className="w-12 font-display text-lg font-bold text-pink-600">{v.size}</span>
              <input
                aria-label={`Estoque do tamanho ${v.size}`}
                className="input !rounded-xl !px-3 !py-1.5"
                type="number" min={0} max={100000} value={v.stock}
                onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : x)))}
              />
              <button type="button" className="btn btn-ghost !p-2 text-ink-300 hover:text-pink-600" onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label={`Remover tamanho ${v.size}`}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="input !w-40" placeholder="Ex.: 18 ou 2-3a" value={customSize} maxLength={12} onChange={(e) => setCustomSize(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }} aria-label="Novo tamanho" />
          <button type="button" className="btn btn-soft btn-sm btn-icon" onClick={addSize}><Plus className="h-4 w-4" /> Adicionar tamanho</button>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Fotos <span className="text-sm font-normal text-ink-500">(a primeira é a capa · até 8 · {MAX_MB} MB cada)</span></h2>
          <button type="button" className="btn btn-blue btn-sm btn-icon" disabled={uploading || images.length >= 8} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Enviar fotos
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>
        {images.length === 0 ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-pink-300 bg-pink-50/60 p-10 text-pink-600 transition hover:bg-pink-100">
            <ImagePlus className="h-10 w-10" /> <span className="font-display font-semibold">Clique para enviar as fotos do produto</span>
          </button>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((p, i) => (
              <li key={p} className={cn('group relative overflow-hidden rounded-3xl ring-2', i === 0 ? 'ring-pink-500' : 'ring-ink-100')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImageUrl(p)} alt={`Foto ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-pink-500 px-2.5 py-0.5 text-xs font-bold text-white">Capa</span>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink-900/70 to-transparent p-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full bg-white/90 p-1.5 disabled:opacity-40" aria-label="Mover para trás"><ArrowLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded-full bg-white/90 p-1.5 disabled:opacity-40" aria-label="Mover para frente"><ArrowRight className="h-4 w-4" /></button>
                  </div>
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="rounded-full bg-white/90 p-1.5 text-pink-600" aria-label="Remover foto"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-wrap gap-6 p-6">
        <label className="flex cursor-pointer items-center gap-3 font-display font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-pink-500" /> Visível na loja
        </label>
        <label className="flex cursor-pointer items-center gap-3 font-display font-semibold">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 accent-pink-500" /> Destacar na página inicial
        </label>
      </section>

      {error && <p role="alert" className="animate-pop rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary btn-lg" disabled={pending || uploading}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : initial.id ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
        <button type="button" className="btn btn-soft btn-lg" onClick={() => router.push('/admin/produtos')}>Cancelar</button>
      </div>
    </form>
  );
}
