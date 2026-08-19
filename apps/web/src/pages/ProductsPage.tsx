import React, { useState } from 'react';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../hooks';
import { Product, formatCurrency } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { error } = useToast();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [unit, setUnit] = useState('Bộ');
  const [price, setPrice] = useState<number | string>(0);
  const [vatRate, setVatRate] = useState<number | string>(0);
  const [active, setActive] = useState(true);

  // Queries & Mutations from custom hooks
  const { data: products = [], isLoading } = useProducts({
    search,
    active: activeFilter,
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const openCreateModal = () => {
    setEditingProduct(null);
    setCode(`EV.${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setShortDescription('');
    setUnit('Bộ');
    setPrice(0);
    setVatRate(0);
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setShortDescription(p.shortDescription || '');
    setUnit(p.unit || 'Bộ');
    setPrice(p.price);
    setVatRate(p.vatRate);
    setActive(p.active);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      error('Vui lòng nhập đầy đủ mã và tên sản phẩm');
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      shortDescription: shortDescription.trim() || null,
      unit: unit.trim() || 'Bộ',
      price: Number(price) || 0,
      vatRate: Number(vatRate) || 0,
      active,
    };

    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data: payload },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
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
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Danh Mục Phụ Kiện Tủ Bếp EUPLUS</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý giá phân phối phụ kiện Inox 304, thùng rác, thùng gạo và tủ bếp
          </p>
        </div>
        <Button
          variant="primary"
          className="self-stretch sm:self-auto justify-center"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Thêm phụ kiện mới
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Tìm theo mã hàng (EV.I80...) hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Trạng thái:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
            >
              <option value="">Tất cả</option>
              <option value="true">Đang kích hoạt (Active)</option>
              <option value="false">Tạm ngưng (Inactive)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[650px] sm:min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Mã hàng</th>
                  <th className="py-3 px-3 sm:px-4">Tên phụ kiện & Quy cách</th>
                  <th className="py-3 px-3 sm:px-4 text-center">ĐVT</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Giá phân phối</th>
                  <th className="py-3 px-3 sm:px-4 text-center">VAT</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                      {prod.code}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="font-semibold text-slate-900">{prod.name}</div>
                      {prod.shortDescription && (
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                          {prod.shortDescription}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-center text-xs text-slate-600 font-medium whitespace-nowrap">
                      {prod.unit}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(prod.price)}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">
                        {prod.vatRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                      {prod.active ? (
                        <Badge variant="success">Hoạt động</Badge>
                      ) : (
                        <Badge variant="default">Tạm ngưng</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingProductId(prod.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
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
        ) : (
          <EmptyState
            title="Không tìm thấy sản phẩm nào"
            description="Hãy tạo sản phẩm mới để thêm vào danh mục phụ kiện EUPLUS."
            actionText="Tạo phụ kiện đầu tiên"
            onAction={openCreateModal}
            icon={<Package className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Modal Create/Edit Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Chỉnh Sửa Phụ Kiện' : 'Thêm Phụ Kiện Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Mã hàng / Mã SP"
              placeholder="VD: EV.I80, EV.80B..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="Đơn vị tính"
              placeholder="Bộ, Chiếc, Mét dài, Hệ..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>

          <Input
            label="Tên phụ kiện / Hạng mục tủ bếp"
            placeholder="VD: Giá bát nâng hạ thông minh SUS304 - KT 800"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả ngắn gọn (Quy cách, Inox 304, xuất xứ...)
            </label>
            <textarea
              rows={2}
              maxLength={250}
              placeholder="Cơ cấu trợ lực nâng hạ 2 tầng Inox 304 cao cấp, giảm chấn..."
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              {shortDescription.length} / 200 ký tự
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Đơn giá phân phối (đ)"
              type="number"
              min="0"
              step="1000"
              placeholder="2596320"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              label="Thuế suất VAT (%)"
              type="number"
              min="0"
              max="100"
              placeholder="8"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <label htmlFor="activeCheckbox" className="text-sm font-medium text-slate-700 cursor-pointer">
              Kích hoạt sử dụng sản phẩm này ngay
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? 'Lưu thay đổi' : 'Tạo phụ kiện'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa phụ kiện này? Các báo giá cũ đã lưu bản chụp (snapshot) vẫn sẽ giữ nguyên số liệu."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
