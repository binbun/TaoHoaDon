import { useEffect, useState } from 'react';
import { ArrowUp, Phone } from 'lucide-react';
import clsx from 'clsx';
import { CONTACT_PHONE, CONTACT_ZALO } from '@/config';

export function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-5 right-4 z-30 flex flex-col items-center gap-3">
      {CONTACT_ZALO && (
        <a
          href={`https://zalo.me/${CONTACT_ZALO}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Nhắn Zalo"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0068ff] text-xs font-bold text-white shadow-lg"
        >
          Zalo
        </a>
      )}
      {CONTACT_PHONE && (
        <a
          href={`tel:${CONTACT_PHONE}`}
          aria-label="Gọi điện"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
          <Phone className="relative h-5 w-5" />
        </a>
      )}
      <button
        type="button"
        aria-label="Lên đầu trang"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow transition',
          showTop ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
