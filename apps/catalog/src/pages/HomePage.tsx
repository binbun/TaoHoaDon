import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { fetchBrands, fetchCategories, fetchProducts } from '@/api';
import { HeroSlider } from '@/components/HeroSlider';
import { ProductGrid, ProductGridSkeleton } from '@/components/ProductCard';
import { categoryIcon } from '@/components/ProductImage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
      <h2 className="section-title relative after:absolute after:-bottom-[13px] after:left-0 after:h-0.5 after:w-full after:bg-primary">
        {title}
      </h2>
      {to && (
        <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-soft hover:text-primary">
          Xem thêm <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`container-site py-10 lg:py-14 ${className}`}>{children}</section>;
}

function ProductSection({ title, tag }: { title: string; tag: 'new' | 'bestseller' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', { tag, limit: 8 }],
    queryFn: () => fetchProducts({ tag, limit: 8 }),
  });

  return (
    <Section>
      <SectionHeader title={title} to={`/san-pham?tag=${tag}`} />
      {isLoading ? <ProductGridSkeleton /> : <ProductGrid products={data?.data ?? []} />}
    </Section>
  );
}

const PROMOS = [
  {
    title: 'Tủ bếp trên nâng hạ',
    text: 'Lấy bát đĩa không cần với cao',
    to: '/san-pham?category=' + encodeURIComponent('Giá bát đĩa nâng hạ'),
    className: 'bg-ink text-white',
  },
  {
    title: 'Tủ kho đồ khô',
    text: 'Chứa gọn mọi chai lọ, đồ khô',
    to: '/san-pham?category=' + encodeURIComponent('Tủ kho phụ kiện'),
    className: 'bg-primary text-white',
  },
  {
    title: 'Thùng gạo & thùng rác',
    text: 'Âm tủ, gọn gàng, sạch sẽ',
    to: '/san-pham?category=' + encodeURIComponent('Thùng gạo thông minh'),
    className: 'bg-cream text-ink',
  },
];

export default function HomePage() {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  useDocumentTitle();

  return (
    <>
      <HeroSlider />

      {/* Category strip */}
      <Section className="!pb-0">
        <SectionHeader title="Danh mục sản phẩm" to="/san-pham" />
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-6 lg:px-0">
          {categories.map((c) => {
            const Icon = categoryIcon(c);
            return (
              <Link
                key={c}
                to={`/san-pham?category=${encodeURIComponent(c)}`}
                className="group w-32 shrink-0 text-center lg:w-auto"
              >
                <div className="flex aspect-square items-center justify-center bg-surface transition group-hover:bg-primary-soft">
                  <Icon strokeWidth={1} className="h-1/2 w-1/2 text-ink-soft transition group-hover:scale-110 group-hover:text-primary" />
                </div>
                <p className="mt-2 text-xs font-medium leading-snug group-hover:text-primary sm:text-sm">{c}</p>
              </Link>
            );
          })}
        </div>
      </Section>

      <ProductSection title="Sản phẩm bán chạy" tag="bestseller" />

      {/* Promo banners */}
      <section className="container-site grid gap-4 md:grid-cols-3">
        {PROMOS.map((promo) => (
          <Link
            key={promo.title}
            to={promo.to}
            className={`group flex min-h-44 flex-col justify-end p-6 transition hover:-translate-y-1 ${promo.className}`}
          >
            <p className="text-lg font-extrabold uppercase">{promo.title}</p>
            <p className="mt-1 text-sm opacity-80">{promo.text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
              Xem ngay <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>

      <ProductSection title="Sản phẩm mới" tag="new" />

      {/* Brands */}
      <Section className="!pt-0">
        <SectionHeader title="Thương hiệu phân phối" />
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b) => (
            <Link
              key={b.id}
              to={`/san-pham?brand=${encodeURIComponent(b.name)}`}
              className="group flex flex-col items-center justify-center gap-2 bg-white px-4 py-8 text-center"
            >
              <span
                className="text-xl font-extrabold tracking-wider grayscale transition group-hover:grayscale-0"
                style={{ color: b.color || undefined }}
              >
                {b.name}
              </span>
              <span className="line-clamp-2 text-xs text-ink-muted">{b.description}</span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
