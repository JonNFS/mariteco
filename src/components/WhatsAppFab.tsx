import { whatsappLink } from '@/lib/utils';
import { WhatsAppIcon } from './icons';

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Mariteco no WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] p-4 text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,.8)] transition-all duration-300 hover:-translate-y-1 hover:scale-110 animate-pulseRing"
    >
      <WhatsAppIcon className="h-7 w-7 transition-transform group-hover:rotate-12" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap font-display font-semibold transition-all duration-300 group-hover:max-w-[10rem] group-hover:pr-1 sm:inline">
        Fale conosco
      </span>
    </a>
  );
}
