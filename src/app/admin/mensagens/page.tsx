import { TemplateEditor, type TemplateRow } from '@/components/admin/TemplateEditor';
import { createClient } from '@/lib/supabase/server';

const ORDER = ['order_paid', 'order_created', 'order_shipped'];

export default async function AdminMessages() {
  const supabase = await createClient();
  const { data } = await supabase.from('message_templates').select('*');
  const rows = ((data ?? []) as TemplateRow[]).sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Mensagens ao cliente</h1>
        <p className="mt-1 text-sm text-ink-500">Edite os textos enviados por e-mail e WhatsApp. Use os campos entre chaves, como <code>{'{pedido}'}</code> e <code>{'{valor}'}</code>.</p>
      </div>
      <p className="rounded-3xl bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Sobre o WhatsApp:</strong> o envio automático pela API oficial da Meta só aceita <em>modelos de mensagem aprovados</em>. O texto aprovado na Meta é o que o cliente recebe automaticamente.
        O texto daqui aparece na prévia e no botão <strong>“Enviar pelo WhatsApp”</strong> em cada pedido, que abre a conversa já escrita (você toca em enviar). Veja o passo a passo no DEPLOY.md.
      </p>
      {rows.map((r) => <TemplateEditor key={r.key} row={r} />)}
    </div>
  );
}
