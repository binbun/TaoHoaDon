import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Product, formatCurrency } from '@taohoadon/shared';
import { useProducts, useDeleteProduct } from '../hooks/useProducts';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ProductFormModal } from '../components/ProductFormModal';

const POPULAR_BRANDS = ['Tất cả', 'GROB', 'EUPLUS', 'HAFELE', 'GARIS'];
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100, 200];

export const ProductsPage: React.FC = () => {
  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBrand, selectedCategory, activeFilter]);

  // Queries & Mutations
  const { data: products = [], isLoading } = useProducts({
    search,
    active: activeFilter,
    brand: selectedBrand === 'Tất cả' ? undefined : selectedBrand,
    category: selectedCategory || undefined,
  });

  const deleteMutation = useDeleteProduct();

  // Extract all categories from products for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Pagination calculations
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, validPage, pageSize]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (deletingProductId) {
      deleteMutation.mutate(deletingProductId, {
        onSuccess: () => setDeletingProductId(null),
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Danh Mục Phụ Kiện & Thiết Bị ({totalItems} sản phẩm)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý giá phân phối phụ kiện Inox 304, nhôm phủ nano, bếp, hút mùi, chậu vòi...
          </p>
        </div>
        <Button
          variant="primary"
          className="self-stretch sm:self-auto justify-center"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Thêm sản phẩm mới
        </Button>
      </div>

      {/* Brand Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-sm">
        {POPULAR_BRANDS.map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBrand(b)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedBrand === b
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {b}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Tìm theo mã mới, mã cũ (GP1-70, C1EC...), tên hoặc kích thước..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
              >
                <option value="">Tất cả danh mục</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="true">Đang kích hoạt</option>
              <option value="false">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : products.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-[800px] sm:min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Mã hàng</th>
                    <th className="py-3 px-3 sm:px-4">Hãng & Danh mục</th>
                    <th className="py-3 px-3 sm:px-4">Tên phụ kiện & Quy cách</th>
                    <th className="py-3 px-3 sm:px-4 text-center">KT / Khoang</th>
                    <th className="py-3 px-3 sm:px-4 text-center">ĐVT</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Đơn Giá Phân Phối (đ)</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 sm:px-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-blue-700 text-xs">{prod.code}</div>
                        {prod.oldCode && (
                          <div className="text-[11px] text-slate-400 font-normal">Cũ: {prod.oldCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            {prod.brand || 'GROB'}
                          </span>
                          <span className="text-xs text-slate-600 truncate max-w-[150px]">
                            {prod.category || 'Khác'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 text-sm">{prod.name}</div>
                        {prod.shortDescription && (
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {prod.shortDescription}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center text-xs text-slate-600 whitespace-nowrap">
                        {prod.cabinetWidth && (
                          <div className="font-semibold text-slate-800">Tủ: {prod.cabinetWidth}mm</div>
                        )}
                        {prod.dimensions && (
                          <div className="text-[11px] text-slate-400">{prod.dimensions}</div>
                        )}
                        {!prod.cabinetWidth && !prod.dimensions && '---'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center text-xs text-slate-600 font-medium whitespace-nowrap">
                        {prod.unit}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(prod.price)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProductId(prod.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị{' '}
                  <strong className="text-slate-900">
                    {totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1} -{' '}
                    {Math.min(validPage * pageSize, totalItems)}
                  </strong>{' '}
                  trong tổng số <strong className="text-slate-900">{totalItems}</strong> sản phẩm
                </span>

                <div className="flex items-center gap-1">
                  <span>| Số lượng / trang:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Page navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={validPage <= 1}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validPage <= 1}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-300 rounded">
                  Trang {validPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validPage >= totalPages}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validPage >= totalPages}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy sản phẩm nào"
            description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc hãng/danh mục khác."
            actionText="Tạo sản phẩm mới"
            onAction={openCreateModal}
            icon={<Package className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Product Create/Edit Modal Component */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        defaultBrand={selectedBrand}
        defaultCategory={selectedCategory}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa sản phẩm này? Các đơn hàng cũ đã lưu bản chụp (snapshot) vẫn sẽ giữ nguyên số liệu."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
