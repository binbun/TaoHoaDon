import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import clsx from 'clsx';
import { fetchBrands, fetchCategories, fetchProducts } from '@/api/client';
import { ProductCard } from '@/components/ProductCard';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const brand = params.get('brand') || '';
  const category = params.get('category') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounce the search box into the URL
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => updateParams({ q: searchInput.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['products', { search, brand, category, page }],
    queryFn: () => fetchProducts({ search, brand, category, page }),
    placeholderData: keepPreviousData,
  });

  const brandByName = useMemo(() => new Map(brands.map((b) => [b.name, b])), [brands]);
  const products = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, mã sản phẩm..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            <FilterChip active={!brand} onClick={() => updateParams({ brand: '' })}>
              Tất cả
            </FilterChip>
            {brands.map((b) => (
              <FilterChip key={b.id} active={brand === b.name} onClick={() => updateParams({ brand: b.name })}>
                {b.name}
              </FilterChip>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => updateParams({ category: e.target.value })}
            className="sm:ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {pagination && (
        <p className="text-sm text-slate-500">
          {pagination.total} sản phẩm{isFetching && ' · đang tải...'}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-slate-500">Không tải được danh sách sản phẩm. Vui lòng thử lại.</p>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} brand={brandByName.get(p.brand)} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 pt-2">
          <PageButton disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
            <ChevronLeft className="w-4 h-4" />
          </PageButton>
          <span className="text-sm text-slate-600">
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <PageButton
            disabled={page >= pagination.totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            <ChevronRight className="w-4 h-4" />
          </PageButton>
        </nav>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
      )}
    >
      {children}
    </button>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
