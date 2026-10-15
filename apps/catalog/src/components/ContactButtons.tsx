import { MessageCircle, Phone } from 'lucide-react';

export const CONTACT_PHONE: string = import.meta.env.VITE_CONTACT_PHONE || '';
const CONTACT_ZALO: string = import.meta.env.VITE_CONTACT_ZALO || '';

export function ContactButtons() {
  if (!CONTACT_PHONE && !CONTACT_ZALO) {
    return <p className="text-sm text-slate-600">Vui lòng liên hệ để nhận báo giá.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {CONTACT_PHONE && (
        <a
          href={`tel:${CONTACT_PHONE}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Phone className="w-4 h-4" />
          Gọi báo giá
        </a>
      )}
      {CONTACT_ZALO && (
        <a
          href={`https://zalo.me/${CONTACT_ZALO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <MessageCircle className="w-4 h-4" />
          Nhắn Zalo
        </a>
      )}
    </div>
  );
}
