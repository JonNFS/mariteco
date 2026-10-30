import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { cartTotals, getCart } from '@/lib/cart';
import { removeCartItem, updateCartQty } from '@/app/actions/cart';
import { brl, productImageUrl } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sacola', robots: { index: false } };

export default async function CartPage() {
  const user = await requireUser('/sacola');
  const lines = await getCart(user.id);
  const { subtotalCents, count } = cartTotals(lines);
  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 0);
  const blocked = lines.some((l) => !l.active || l.stock < l.quantity);

  if (lines.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <div className="mx-auto flex h-28 w-28 animate-float items-center justify-center rounded-full bg-pink-100 text-pink-500"><ShoppingBag className="h-14 w-14" /></div>
        <h1 className="mt-6 font-display text-4xl font-bold">Sua sacola está vazia</h1>
        <p className="mt-2 text-ink-500">Que tal escolher uma roupinha linda?</p>
        <Link href="/loja" className="btn btn-primary btn-lg mt-8">Ir para a loja</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="font-display text-4xl font-bold">Minha sacola <span className="text-pink-500">({count})</span></h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-4">
          {lines.map((l) => (
            <li key={l.id} className="card flex gap-4 p-4">
              <Link href={`/produto/${l.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-3xl bg-pink-50 sm:h-32 sm:w-28">
                <Image src={productImageUrl(l.image)} alt={l.name} fill sizes="112px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link href={`/produto/${l.slug}`} className="font-display text-lg font-semibold leading-snug hover:text-pink-600">{l.name}</Link>
                <p className="text-sm text-ink-500">Tamanho: <strong className="text-ink-700">{l.size}</strong></p>
                {(!l.active || l.stock < l.quantity) && (
                  <p className="mt-1 text-sm font-bold text-pink-600">{!l.active || l.stock === 0 ? 'Indisponível no momento — remova para continuar.' : `Só restam ${l.stock} unidade(s) — ajuste a quantidade.`}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-full bg-white p-1 ring-2 ring-ink-100">
                    <form action={updateCartQty}>
                      <input type="hidden" name="id" value={l.id} /><input type="hidden" name="quantity" value={Math.max(1, l.quantity - 1)} />
                      <button className="btn btn-ghost !p-2" aria-label="Diminuir" disabled={l.quantity <= 1}><Minus className="h-4 w-4" /></button>
                    </form>
                    <span className="w-8 text-center font-display font-bold">{l.quantity}</span>
                    <form action={updateCartQty}>
                      <input type="hidden" name="id" value={l.id} /><input type="hidden" name="quantity" value={l.quantity + 1} />
                      <button className="btn btn-ghost !p-2" aria-label="Aumentar" disabled={l.quantity >= Math.min(l.stock, 20)}><Plus className="h-4 w-4" /></button>
                    </form>
                  </div>
                  <span className="font-display text-xl font-bold text-pink-600">{brl(l.priceCents * l.quantity)}</span>
                  <form action={removeCartItem}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="btn btn-ghost btn-icon btn-sm text-ink-500" aria-label={`Remover ${l.name}`}><Trash2 className="h-4 w-4" /> Remover</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-32">
          <h2 className="font-display text-2xl font-bold">Resumo</h2>
          <div className="flex justify-between text-ink-700"><span>Subtotal</span><strong>{brl(subtotalCents)}</strong></div>
          <div className="flex justify-between text-sm text-ink-500"><span>Frete</span><span>calculado no checkout</span></div>
          {threshold > 0 && (
            <p className="flex items-start gap-2 rounded-2xl bg-sky-50 p-3 text-sm font-semibold text-sky-700">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              {subtotalCents >= threshold ? 'Você ganhou frete grátis! 🎉' : `Faltam ${brl(threshold - subtotalCents)} para o frete grátis.`}
            </p>
          )}
          <div className="flex justify-between border-t border-dashed border-pink-200 pt-4 font-display text-xl font-bold"><span>Total</span><span className="text-pink-600">{brl(subtotalCents)}</span></div>
          {blocked ? (
            <button className="btn btn-primary btn-lg w-full" disabled>Ajuste os itens para continuar</button>
          ) : (
            <Link href="/checkout" className="btn btn-primary btn-lg w-full">Continuar para entrega</Link>
          )}
          <Link href="/loja" className="block text-center text-sm font-bold text-sky-600 hover:underline">Continuar comprando</Link>
        </aside>
      </div>
    </div>
  );
}
