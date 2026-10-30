import { cn } from '@/lib/utils';

/** Manchas de aquarela decorativas (rosa/azul), inspiradas no logo. */
export function Blob({ className, tone = 'pink' }: { className?: string; tone?: 'pink' | 'sky' | 'sun' | 'mint' }) {
  const fill = { pink: '#FFC2D9', sky: '#B9E1FF', sun: '#FFE8A3', mint: '#BFEBD3' }[tone];
  return (
    <svg viewBox="0 0 200 200" className={cn('pointer-events-none absolute -z-10 opacity-70 blur-[2px]', className)} aria-hidden>
      <path
        fill={fill}
        d="M43.5,-61.4C55.9,-52.4,65.1,-39.2,70.2,-24.5C75.3,-9.8,76.4,6.3,71.5,20.4C66.6,34.5,55.7,46.6,42.7,55.4C29.7,64.2,14.9,69.7,-1.4,71.4C-17.7,73.1,-35.4,71,-48.2,62C-61,53,-68.9,37.1,-72.1,20.5C-75.3,3.9,-73.8,-13.4,-66.1,-27.1C-58.4,-40.8,-44.5,-50.9,-30.7,-59.4C-16.9,-67.9,-3.2,-74.8,10.4,-73.2C24,-71.6,31.1,-70.4,43.5,-61.4Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('pointer-events-none absolute', className)} fill="currentColor" aria-hidden>
      <path d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0Z" />
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 20" className={cn('pointer-events-none', className)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden>
      <path d="M4 10c10-12 16 12 26 0s16 12 26 0 16 12 26 0 16 12 26 0" />
    </svg>
  );
}
