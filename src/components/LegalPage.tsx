export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">Última atualização: {updated}</p>
      <div className="card mt-6 space-y-4 p-6 leading-relaxed text-ink-700 sm:p-10 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_a]:font-bold [&_a]:text-pink-600 [&_a]:underline [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_td]:border-t [&_td]:border-pink-100 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3">
        {children}
      </div>
    </div>
  );
}
