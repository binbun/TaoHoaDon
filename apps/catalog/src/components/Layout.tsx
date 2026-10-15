import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { CONTACT_PHONE } from './ContactButtons';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="font-bold text-lg tracking-tight">
            Danh Mục Sản Phẩm
          </Link>
          {CONTACT_PHONE && (
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{CONTACT_PHONE}</span>
            </a>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Liên hệ để nhận báo giá chi tiết.
      </footer>
    </div>
  );
}
