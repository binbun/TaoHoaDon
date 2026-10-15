import { MessageCircle, Phone } from 'lucide-react';
import clsx from 'clsx';
import { CONTACT_PHONE, CONTACT_ZALO } from '@/config';

export function ContactButtons({ className }: { className?: string }) {
  if (!CONTACT_PHONE && !CONTACT_ZALO) {
    return <p className="text-sm text-ink-soft">Vui lòng liên hệ cửa hàng để nhận báo giá.</p>;
  }

  return (
    <div className={clsx('grid gap-3 sm:grid-cols-2', className)}>
      {CONTACT_PHONE && (
        <a href={`tel:${CONTACT_PHONE}`} className="btn-primary">
          <Phone className="h-4 w-4" />
          Gọi báo giá
        </a>
      )}
      {CONTACT_ZALO && (
        <a
          href={`https://zalo.me/${CONTACT_ZALO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          <MessageCircle className="h-4 w-4" />
          Nhắn Zalo
        </a>
      )}
    </div>
  );
}
