import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { fetchBrands, fetchProduct } from '@/api/client';
import { BrandTag } from '@/components/ProductCard';
import { ContactButtons } from '@/components/ContactButtons';

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-slate-200/70 animate-pulse" />;
  }

  if (isError || !product) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-500">Không tìm thấy sản phẩm.</p>
        <Link to="/" className="text-blue-700 font-medium hover:underline">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const brand = brands.find((b) => b.name === product.brand);
  const specs = [
    ['Mã sản phẩm', product.code],
    ['Thương hiệu', product.brand],
    ['Danh mục', product.category],
    ['Chiều rộng tủ', product.cabinetWidth],
    ['Kích thước', product.dimensions],
    ['Đơn vị', product.unit],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        Danh mục
      </Link>

      <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
        <header className="space-y-3">
          <BrandTag name={product.brand} brand={brand} />
          <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
          {product.shortDescription && <p className="text-slate-600">{product.shortDescription}</p>}
        </header>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t border-slate-100">
          {specs.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium text-right">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg bg-blue-50 p-4 sm:p-5 space-y-3">
          <p className="font-semibold text-blue-900">Liên hệ để nhận báo giá cho sản phẩm này</p>
          <ContactButtons />
        </div>
      </article>
    </div>
  );
}
