import { SettingsForm } from '@/components/admin/SettingsForm';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Configurações da loja</h1>
      <SettingsForm initial={s} />
    </div>
  );
}
