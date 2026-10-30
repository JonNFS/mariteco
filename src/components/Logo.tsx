import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="Mariteco — página inicial" className={cn('inline-block transition-transform duration-300 hover:-rotate-1 hover:scale-105', className)}>
      <Image src="/brand/logo-wordmark.png" alt="Mariteco" width={384} height={85} priority={priority} className="h-9 w-auto sm:h-11" />
    </Link>
  );
}
