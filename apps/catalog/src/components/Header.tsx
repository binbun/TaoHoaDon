import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Menu, MessageCircle, Phone, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { fetchBrands, fetchCategories } from '@/api';
import { CONTACT_PHONE, CONTACT_ZALO, STORE_NAME } from '@/config';
import { useDrawer } from '@/hooks/useDrawer';
import { categoryIcon } from './ProductImage';

export function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-lg font-extrabold text-white">
        {STORE_NAME.charAt(0)}
      </span>
      <span className="truncate text-base font-extrabold uppercase leading-none tracking-wide text-ink sm:text-lg">
        {STORE_NAME}
      </span>
    </Link>
  );
}

function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') || '');

  useEffect(() => setValue(params.get('q') || ''), [params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/san-pham?q=${encodeURIComponent(q)}` : '/san-pham');
  };

  return (
    <form onSubmit={submit} className={clsx('flex', className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm sản phẩm, mã sản phẩm..."
        className="min-w-0 flex-1 border border-r-0 border-line bg-white px-4 py-2 text-base outline-none lg:py-2.5 lg:text-sm focus:border-primary"
      />
      <button type="submit" aria-label="Tìm kiếm" className="bg-primary px-4 text-white hover:bg-primary-dark">
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'relative flex h-12 items-center gap-1 text-sm font-semibold uppercase tracking-wide transition hover:text-primary',
    isActive ? 'text-primary' : 'text-ink'
  );

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });

  // Ẩn dropdown desktop sau khi chọn mục (đến khi rời chuột khỏi menu)
  const [dropdownClosed, setDropdownClosed] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => setMenuOpen(false), [location]);
  useDrawer(menuOpen, closeMenu);

  const closeDropdown = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setDropdownClosed(true);
  };
  const dropdownGroupProps = {
    onMouseLeave: () => setDropdownClosed(false),
    onFocus: () => setDropdownClosed(false),
  };
  const dropdownClass = clsx(
    'invisible absolute top-full border-t border-line bg-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
    dropdownClosed && '!invisible !opacity-0'
  );

  const goToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    setTimeout(() => document.getElementById('lien-he')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_#e7e7e7]">
      {/* Top bar (chỉ desktop — hotline trên mobile có trong menu & nút nổi) */}
      <div className="hidden bg-ink text-white lg:block">
        <div className="container-site flex h-9 items-center justify-between text-xs">
          <p className="truncate">Hàng chính hãng · Bảo hành đến 5 năm · Giao hàng & lắp đặt tận nơi</p>
          {CONTACT_PHONE && (
            <a href={`tel:${CONTACT_PHONE}`} className="hidden shrink-0 items-center gap-1.5 font-semibold sm:flex">
              <Phone className="h-3.5 w-3.5" />
              Hotline: {CONTACT_PHONE}
            </a>
          )}
        </div>
      </div>

      {/* Logo row */}
      <div className="container-site flex h-14 items-center gap-4 lg:h-20 lg:gap-10">
        <button
          type="button"
          aria-label="Mở menu"
          onClick={() => setMenuOpen(true)}
          className="-ml-1 p-1 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Logo />
        <SearchBox className="hidden flex-1 lg:flex" />
        <div className="ml-auto flex shrink-0 items-center gap-4 lg:ml-0">
          {CONTACT_PHONE && (
            <a href={`tel:${CONTACT_PHONE}`} aria-label={`Gọi tư vấn ${CONTACT_PHONE}`} className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line">
                <Phone className="h-4 w-4 text-primary" />
              </span>
              <span className="hidden text-xs leading-tight xl:block">
                <span className="block text-ink-muted">Tư vấn báo giá</span>
                <span className="block text-sm font-bold">{CONTACT_PHONE}</span>
              </span>
            </a>
          )}
          {CONTACT_ZALO && (
            <a
              href={`https://zalo.me/${CONTACT_ZALO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 bg-[#0068ff] px-4 py-2.5 text-xs font-semibold uppercase text-white hover:opacity-90 sm:flex"
            >
              <MessageCircle className="h-4 w-4" />
              Zalo
            </a>
          )}
        </div>
      </div>

      <div className="container-site pb-3 lg:hidden">
        <SearchBox />
      </div>

      {/* Desktop nav */}
      <nav className="hidden border-t border-line lg:block">
        <div className="container-site flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>
            Trang chủ
          </NavLink>

          <div className="group" {...dropdownGroupProps}>
            <NavLink to="/san-pham" className={navLinkClass}>
              Sản phẩm <ChevronDown className="h-4 w-4" />
            </NavLink>
            {/* Mega menu */}
            <div className={clsx(dropdownClass, 'inset-x-0')}>
              <div className="container-site grid grid-cols-4 gap-x-8 gap-y-1 py-6">
                {categories.map((c) => {
                  const Icon = categoryIcon(c);
                  return (
                    <Link
                      key={c}
                      to={`/san-pham?category=${encodeURIComponent(c)}`}
                      onClick={closeDropdown}
                      className="flex items-center gap-3 py-2 text-sm text-ink hover:text-primary"
                    >
                      <Icon strokeWidth={1.5} className="h-5 w-5 text-ink-muted" />
                      {c}
                    </Link>
                  );
                })}
                <Link
                  to="/san-pham"
                  onClick={closeDropdown}
                  className="col-span-4 mt-3 inline-flex items-center gap-1 border-t border-line pt-4 text-sm font-semibold text-primary"
                >
                  Xem tất cả sản phẩm <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="group relative" {...dropdownGroupProps}>
            <button type="button" aria-haspopup="true" className={navLinkClass({ isActive: false }) + ' cursor-default'}>
              Thương hiệu <ChevronDown className="h-4 w-4" />
            </button>
            <div className={clsx(dropdownClass, 'left-0 min-w-56 py-2')}>
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/san-pham?brand=${encodeURIComponent(b.name)}`}
                  onClick={closeDropdown}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-surface hover:text-primary"
                >
                  <span className="h-2.5 w-2.5" style={{ backgroundColor: b.color || '#999' }} />
                  {b.name}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/san-pham?tag=new" className={navLinkClass({ isActive: false })}>
            Sản phẩm mới
          </Link>
          <Link to="/san-pham?tag=bestseller" className={navLinkClass({ isActive: false })}>
            Bán chạy
          </Link>
          <a href="#lien-he" className={navLinkClass({ isActive: false })}>
            Liên hệ
          </a>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={clsx('fixed inset-0 z-50 bg-black/40 transition lg:hidden', menuOpen ? 'visible opacity-100' : 'invisible opacity-0')}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col bg-white transition-transform lg:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo />
          <button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} className="p-1">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MobileSection title="Danh mục">
            <MobileLink to="/san-pham">Tất cả sản phẩm</MobileLink>
            <MobileLink to="/san-pham?tag=new">Sản phẩm mới</MobileLink>
            <MobileLink to="/san-pham?tag=bestseller">Bán chạy</MobileLink>
            {categories.map((c) => (
              <MobileLink key={c} to={`/san-pham?category=${encodeURIComponent(c)}`}>
                {c}
              </MobileLink>
            ))}
          </MobileSection>
          <MobileSection title="Thương hiệu">
            {brands.map((b) => (
              <MobileLink key={b.id} to={`/san-pham?brand=${encodeURIComponent(b.name)}`}>
                {b.name}
              </MobileLink>
            ))}
          </MobileSection>
          <a
            href="#lien-he"
            onClick={goToContact}
            className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-ink active:bg-surface"
          >
            Liên hệ
            <ChevronRight className="h-4 w-4 text-ink-muted" />
          </a>
        </div>
        {CONTACT_PHONE && (
          <a href={`tel:${CONTACT_PHONE}`} className="btn-primary m-4">
            <Phone className="h-4 w-4" /> {CONTACT_PHONE}
          </a>
        )}
      </aside>
    </header>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-2">
      <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-muted">{title}</p>
      {children}
    </div>
  );
}

function MobileLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-2.5 text-sm text-ink active:bg-surface">
      {children}
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}
