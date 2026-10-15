import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Check, ShieldCheck, Truck } from 'lucide-react';
import clsx from 'clsx';
import { fetchProduct, fetchRelatedProducts } from '@/api';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ContactButtons } from '@/components/ContactButtons';
import { ProductBadges, ProductGrid } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';

const GALLERY = [0, 1, 2, 3];

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const [imageIndex, setImageIndex] = useState(0);
  const [width, setWidth] = useState('');
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  });
  const { data: related = [] } = useQuery({
    queryKey: ['related', id],
    queryFn: () => fetchRelatedProducts(product!, 4),
    enabled: !!product,
  });

  useEffect(() => {
    setImageIndex(0);
    setTab('desc');
    setWidth(product?.widths?.[0] ?? '');
  }, [product]);

  if (isLoading) {
    return (
      <div className="container-site grid animate-pulse gap-10 py-10 lg:grid-cols-2">
        <div className="aspect-square bg-surface" />
        <div className="space-y-4">
          <div className="h-4 w-24 bg-surface" />
          <div className="h-8 w-3/4 bg-surface" />
          <div className="h-20 bg-surface" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-site space-y-4 py-24 text-center">
        <p className="text-ink-muted">Không tìm thấy sản phẩm.</p>
        <Link to="/san-pham" className="btn-primary">
          Xem tất cả sản phẩm
        </Link>
      </div>
    );
  }

  const widths = product.widths ?? [];
  const specs = [
    ['Mã sản phẩm', product.code],
    ['Thương hiệu', product.brand],
    ['Danh mục', product.category],
    ['Chiều rộng tủ', widths.length ? `${widths.join(' / ')} mm` : product.cabinetWidth],
    ['Kích thước', product.dimensions],
    ['Chất liệu', product.material],
    ['Xuất xứ', product.origin],
    ['Bảo hành', product.warranty],
    ['Đơn vị', product.unit],
  ].filter(([, value]) => value) as [string, string][];

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: product.category, to: `/san-pham?category=${encodeURIComponent(product.category)}` },
          { label: product.name },
        ]}
      />

      <div className="container-site grid gap-8 py-8 lg:grid-cols-2 lg:gap-14 lg:py-12">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <div className="no-scrollbar flex gap-3 overflow-x-auto sm:w-20 sm:flex-col">
            {GALLERY.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setImageIndex(v)}
                className={clsx(
                  'w-20 shrink-0 border-2 transition',
                  imageIndex === v ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <ProductImage product={product} variant={v} showCode={false} />
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <ProductBadges product={product} />
            <ProductImage product={product} variant={imageIndex} />
          </div>
        </div>

        {/* Info */}
        <div>
          <Link
            to={`/san-pham?brand=${encodeURIComponent(product.brand)}`}
            className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted hover:text-primary"
          >
            {product.brand}
          </Link>
          <h1 className="mt-2 text-2xl font-bold leading-snug lg:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Mã: <span className="font-medium text-ink">{product.code}</span>
          </p>

          <div className="mt-5 bg-surface px-5 py-4">
            <span className="text-sm text-ink-muted">Giá: </span>
            <span className="text-2xl font-bold text-primary">Liên hệ</span>
          </div>

          {product.shortDescription && <p className="mt-5 leading-relaxed text-ink-soft">{product.shortDescription}</p>}

          {widths.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm">
                Chiều rộng tủ: <span className="font-semibold">{width} mm</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {widths.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    className={clsx(
                      'min-w-16 border px-3 py-2 text-sm transition',
                      width === w ? 'border-primary font-semibold text-primary' : 'border-line hover:border-ink'
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ContactButtons className="mt-8" />

          <ul className="mt-8 grid gap-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <ShieldCheck strokeWidth={1.5} className="h-6 w-6 shrink-0 text-primary" />
              Bảo hành {product.warranty?.toLowerCase() || 'chính hãng'}
            </li>
            <li className="flex items-center gap-2">
              <Truck strokeWidth={1.5} className="h-6 w-6 shrink-0 text-primary" />
              Giao & lắp đặt tận nơi
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck strokeWidth={1.5} className="h-6 w-6 shrink-0 text-primary" />
              Hàng chính hãng
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <section className="container-site pb-12">
        <div className="flex gap-8 border-b border-line">
          {(
            [
              ['desc', 'Mô tả sản phẩm'],
              ['specs', 'Thông số kỹ thuật'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                '-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-wide transition',
                tab === key ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl py-6">
          {tab === 'desc' ? (
            <div className="space-y-4 text-ink-soft">
              <p>{product.shortDescription}</p>
              {product.features && product.features.length > 0 && (
                <ul className="space-y-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label} className="odd:bg-surface">
                    <th className="w-2/5 px-4 py-3 text-left font-medium text-ink-muted">{label}</th>
                    <td className="px-4 py-3">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-site pb-14">
          <h2 className="section-title mb-6 border-b border-line pb-3">Sản phẩm liên quan</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
