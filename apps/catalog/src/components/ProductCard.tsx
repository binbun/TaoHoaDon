import { Link } from 'react-router-dom';
import type { PublicBrand, PublicProduct } from '@/api/client';

export function BrandTag({ name, brand }: { name: string; brand?: PublicBrand }) {
  const color = brand?.color || '#475569';
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {name}
    </span>
  );
}

export function ProductCard({ product, brand }: { product: PublicProduct; brand?: PublicBrand }) {
  return (
    <Link
      to={`/san-pham/${product.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <BrandTag name={product.brand} brand={brand} />
        <span className="text-xs text-slate-500 truncate">{product.category}</span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug text-slate-900 group-hover:text-blue-700 line-clamp-2">
        {product.name}
      </h3>
      <p className="mt-1 text-xs font-mono text-slate-500">{product.code}</p>
      {product.shortDescription && (
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.shortDescription}</p>
      )}
      <div className="mt-auto pt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {product.cabinetWidth && <span>Tủ: {product.cabinetWidth}</span>}
        {product.dimensions && <span>KT: {product.dimensions}</span>}
      </div>
    </Link>
  );
}
