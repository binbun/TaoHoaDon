import { Link } from 'react-router-dom';
import type { PublicProduct } from '@/api';
import { ProductImage } from './ProductImage';

export function ProductBadges({ product }: { product: PublicProduct }) {
  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
      {product.isNew && (
        <span className="bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-white">Mới</span>
      )}
      {product.isBestSeller && (
        <span className="bg-ink px-2 py-0.5 text-[11px] font-bold uppercase text-white">Bán chạy</span>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: PublicProduct }) {
  const widths = product.widths ?? [];
  return (
    <Link to={`/san-pham/${product.id}`} className="group flex flex-col">
      <div className="relative overflow-hidden">
        <ProductBadges product={product} />
        <ProductImage product={product} className="transition duration-500 group-hover:scale-105" />
        {/* Second image on hover, like a product photo swap */}
        <ProductImage
          product={product}
          variant={1}
          className="!absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
        />
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-primary py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-white transition duration-300 group-hover:translate-y-0">
          Xem chi tiết
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">{product.brand}</span>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mt-2 text-sm font-bold text-primary">Liên hệ báo giá</p>
        {widths.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {widths.slice(0, 4).map((w) => (
              <span key={w} className="border border-line px-1.5 py-0.5 text-[11px] text-ink-soft">
                {w}
              </span>
            ))}
            {widths.length > 4 && <span className="px-1 py-0.5 text-[11px] text-ink-muted">+{widths.length - 4}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, columns = 4 }: { products: PublicProduct[]; columns?: 3 | 4 }) {
  return (
    <div
      className={
        columns === 4
          ? 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4'
          : 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3'
      }
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div
      className={
        columns === 4
          ? 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4'
          : 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3'
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-square bg-surface" />
          <div className="h-3 w-1/3 bg-surface" />
          <div className="h-4 w-4/5 bg-surface" />
        </div>
      ))}
    </div>
  );
}
