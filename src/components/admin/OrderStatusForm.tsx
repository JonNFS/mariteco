'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateOrder, type AdminResult } from '@/app/actions/admin';
import { ORDER_STATUS } from '@/lib/constants';

export function OrderStatusForm({ id, status, tracking }: { id: string; status: string; tracking: string }) {
  const [state, action, pending] = useActionState<AdminResult | undefined, FormData>(updateOrder, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor={`st-${id}`}>Status</label>
        <select id={`st-${id}`} name="status" defaultValue={status} className="input !py-2">
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor={`tr-${id}`}>Código de rastreio</label>
        <input id={`tr-${id}`} name="tracking" defaultValue={tracking} maxLength={60} className="input !py-2" placeholder="Opcional" />
      </div>
      <button className="btn btn-blue btn-sm" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}</button>
      {state && <p role="status" className={`w-full text-sm font-bold ${state.ok ? 'text-emerald-600' : 'text-pink-600'}`}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}
