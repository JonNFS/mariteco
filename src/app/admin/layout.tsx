import Link from 'next/link';
import type { Metadata } from 'next';
import { Boxes, ClipboardList, LayoutDashboard, MessageSquareText, Settings, Store, Ticket } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const LINKS = [
  { href: '/admin', label: 'Resumo', icon: LayoutDashboard },
  { href: '/admin/produtos', label: 'Produtos', icon: Boxes },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/cupons', label: 'Cupons', icon: Ticket },
  { href: '/admin/mensagens', label: 'Mensagens', icon: MessageSquareText },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-page py-8">
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside className="card h-fit p-3 lg:sticky lg:top-32">
          <p className="px-3 pb-2 pt-1 font-display text-sm font-bold uppercase tracking-wider text-ink-300">Painel</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="btn btn-ghost btn-icon !justify-start !rounded-2xl whitespace-nowrap">
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
            <Link href="/" className="btn btn-ghost btn-icon !justify-start !rounded-2xl whitespace-nowrap text-sky-600">
              <Store className="h-5 w-5" /> Ver loja
            </Link>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
