import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { fetchBrands, fetchCategories, fetchProducts, ProductQuery, ProductSort } from '@/api';
import { Breadcrumb, Crumb } from '@/components/Breadcrumb';
import { ProductGrid, ProductGridSkeleton } from '@/components/ProductCard';

const PAGE_SIZE = 12;
const WIDTHS = ['200', '250', '300', '350', '400', '450', '500', '600', '700', '800', '900'];
const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'default', label: 'Mặc định' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name-asc', label: 'Tên A → Z' },
  { value: 'name-desc', label: 'Tên Z → A' },
];
const TAG_LABELS = { new: 'Sản phẩm mới', bestseller: 'Sản phẩm bán chạy' } as const;

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = params.get('q') || '';
  const brand = params.get('brand') || '';
  const category = params.get('category') || '';
  const width = params.get('width') || '';
  const tagParam = params.get('tag');
  const tag = tagParam === 'new' || tagParam === 'bestseller' ? tagParam : undefined;
  const sort = (params.get('sort') as ProductSort) || 'default';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const query: ProductQuery = { search, brand, category, width, tag, sort, page, limit: PAGE_SIZE };
  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', query],
    queryFn: () => fetchProducts(query),
    placeholderData: keepPreviousData,
  });

  const title = category || (brand && `Thương hiệu ${brand}`) || (tag && TAG_LABELS[tag]) || 'Tất cả sản phẩm';
  const crumbs: Crumb[] = [{ label: 'Trang chủ', to: '/' }, { label: 'Sản phẩm', to: '/san-pham' }];
  if (title !== 'Tất cả sản phẩm') crumbs.push({ label: title });

  const activeFilters = [
    search && { key: 'q', label: `"${search}"` },
    category && { key: 'category', label: category },
    brand && { key: 'brand', label: brand },
    width && { key: 'width', label: `Rộng ${width} mm` },
    tag && { key: 'tag', label: TAG_LABELS[tag] },
  ].filter(Boolean) as { key: string; label: string }[];

  const filters = (
    <div className="space-y-8">
      <FilterGroup title="Danh mục">
        <FilterOption active={!category} onClick={() => updateParams({ category: '' })}>
          Tất cả
        </FilterOption>
        {categories.map((c) => (
          <FilterOption key={c} active={category === c} onClick={() => updateParams({ category: c })}>
            {c}
          </FilterOption>
        ))}
      </FilterGroup>

      <FilterGroup title="Thương hiệu">
        {brands.map((b) => (
          <FilterOption
            key={b.id}
            active={brand === b.name}
            onClick={() => updateParams({ brand: brand === b.name ? '' : b.name })}
          >
            {b.name}
          </FilterOption>
        ))}
      </FilterGroup>

      <FilterGroup title="Chiều rộng tủ (mm)">
        <div className="flex flex-wrap gap-2">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateParams({ width: width === w ? '' : w })}
              className={clsx(
                'min-w-14 border px-2 py-1.5 text-xs transition',
                width === w ? 'border-primary bg-primary text-white' : 'border-line hover:border-ink'
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      <Breadcrumb items={crumbs} />

      <div className="container-site py-8 lg:py-10">
        <h1 className="section-title mb-6">{title}</h1>

        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">{filters}</aside>

          <div>
            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 border border-line px-3 py-2 text-sm font-medium lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Bộ lọc
              </button>
              <p className="text-sm text-ink-muted">{data ? `${data.pagination.total} sản phẩm` : ' '}</p>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <span className="hidden text-ink-muted sm:inline">Sắp xếp:</span>
                <select
                  value={sort}
                  onChange={(e) => updateParams({ sort: e.target.value === 'default' ? '' : e.target.value })}
                  className="border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => updateParams({ [f.key]: '' })}
                    className="flex items-center gap-1.5 bg-surface px-3 py-1.5 text-xs font-medium hover:bg-primary-soft"
                  >
                    {f.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setParams(new URLSearchParams())}
                  className="px-2 text-xs font-semibold text-primary hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {isLoading ? (
              <ProductGridSkeleton columns={3} count={6} />
            ) : isError ? (
              <p className="py-20 text-center text-ink-muted">Không tải được danh sách sản phẩm. Vui lòng thử lại.</p>
            ) : !data || data.data.length === 0 ? (
              <p className="py-20 text-center text-ink-muted">Không tìm thấy sản phẩm phù hợp.</p>
            ) : (
              <ProductGrid products={data.data} columns={3} />
            )}

            {data && data.pagination.totalPages > 1 && (
              <Pager
                page={page}
                totalPages={data.pagination.totalPages}
                onChange={(p) => updateParams({ page: p > 1 ? String(p) : '' })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={clsx('fixed inset-0 z-50 bg-black/40 transition lg:hidden', filtersOpen ? 'visible opacity-100' : 'invisible opacity-0')}
        onClick={() => setFiltersOpen(false)}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white transition-transform lg:hidden',
          filtersOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <p className="font-bold uppercase">Bộ lọc</p>
          <button type="button" aria-label="Đóng" onClick={() => setFiltersOpen(false)} className="p-1">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{filters}</div>
        <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary m-4">
          Xem {data?.pagination.total ?? ''} sản phẩm
        </button>
      </aside>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 border-b border-line pb-2 text-sm font-bold uppercase tracking-wide">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 py-1.5 text-left text-sm transition hover:text-primary',
        active ? 'font-semibold text-primary' : 'text-ink-soft'
      )}
    >
      <span
        className={clsx(
          'flex h-4 w-4 shrink-0 items-center justify-center border',
          active ? 'border-primary bg-primary text-white' : 'border-line'
        )}
      >
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  const cell = 'flex h-10 min-w-10 items-center justify-center border px-2 text-sm transition';

  return (
    <nav className="mt-12 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={clsx(cell, 'border-line hover:border-ink disabled:opacity-30')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-ink-muted">…</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            className={clsx(cell, p === page ? 'border-primary bg-primary font-semibold text-white' : 'border-line hover:border-ink')}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={clsx(cell, 'border-line hover:border-ink disabled:opacity-30')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
