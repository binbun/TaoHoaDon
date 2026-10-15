import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Headset, Mail, MapPin, Phone, ShieldCheck, Truck } from 'lucide-react';
import { fetchBrands, fetchCategories } from '@/api';
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_ZALO, STORE_NAME } from '@/config';
import { Logo } from './Header';

const BENEFITS = [
  { icon: Truck, title: 'Giao hàng & lắp đặt', text: 'Tận nơi, nhanh chóng' },
  { icon: ShieldCheck, title: 'Bảo hành đến 5 năm', text: 'Trọn đời với BLUM' },
  { icon: BadgeCheck, title: 'Hàng chính hãng', text: 'Đầy đủ CO, CQ' },
  { icon: Headset, title: 'Tư vấn miễn phí', text: 'Chọn đúng kích thước tủ' },
];

export function BenefitsBar() {
  return (
    <section className="border-y border-line bg-cream">
      <div className="container-site grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <Icon strokeWidth={1.5} className="h-9 w-9 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold uppercase leading-tight">{title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });

  return (
    <footer id="lien-he">
      <BenefitsBar />
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-ink-soft">
            Chuyên phân phối phụ kiện tủ bếp chính hãng: giá bát đĩa, mâm xoay, tủ kho, tay nâng và bản lề cao cấp.
          </p>
        </div>

        <FooterColumn title="Danh mục">
          {categories.slice(0, 7).map((c) => (
            <FooterLink key={c} to={`/san-pham?category=${encodeURIComponent(c)}`}>
              {c}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Thương hiệu">
          {brands.map((b) => (
            <FooterLink key={b.id} to={`/san-pham?brand=${encodeURIComponent(b.name)}`}>
              {b.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Liên hệ">
          {CONTACT_ADDRESS && (
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {CONTACT_ADDRESS}
            </li>
          )}
          {CONTACT_PHONE && (
            <li>
              <a href={`tel:${CONTACT_PHONE}`} className="flex gap-2 hover:text-primary">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {CONTACT_PHONE}
              </a>
            </li>
          )}
          {CONTACT_ZALO && (
            <li>
              <a
                href={`https://zalo.me/${CONTACT_ZALO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-2 hover:text-primary"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-[#0068ff] text-[8px] font-bold text-white">
                  Z
                </span>
                Zalo: {CONTACT_ZALO}
              </a>
            </li>
          )}
          {CONTACT_EMAIL && (
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex gap-2 hover:text-primary">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {CONTACT_EMAIL}
              </a>
            </li>
          )}
        </FooterColumn>
      </div>
      <div className="bg-ink py-4 text-center text-xs text-white/70">
        © {new Date().getFullYear()} {STORE_NAME}. Giá sản phẩm vui lòng liên hệ để được báo giá chi tiết.
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide">{title}</h4>
      <ul className="space-y-2.5 text-sm text-ink-soft">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="hover:text-primary">
        {children}
      </Link>
    </li>
  );
}
