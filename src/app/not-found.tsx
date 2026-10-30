import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="animate-float font-display text-8xl font-bold gradient-text">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Ops! Essa página saiu para brincar 🎈</h1>
      <p className="mt-2 text-ink-500">Não encontramos o que você procurava.</p>
      <Link href="/" className="btn btn-primary btn-lg mt-8">Voltar para o início</Link>
    </div>
  );
}
