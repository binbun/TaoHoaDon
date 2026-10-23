import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Package,
  Loader2,
} from 'lucide-react';
import { Brand } from '@taohoadon/shared';
import { useBrands, useUpdateBrand, useDeleteBrand } from '../hooks/useBrands';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { BrandBadge } from '../components/BrandBadge';
import { BrandFormModal } from '../components/BrandFormModal';
import { Switch } from '../components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export const BrandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  // Queries & Mutations
  const { data: brands = [], isLoading } = useBrands('all');
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  // Filtered brands
  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.trim().toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.code && b.code.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [brands, search]);

  // Stats
  const totalBrands = brands.length;
  const activeBrandsCount = brands.filter((b) => b.active).length;
  const totalProducts = brands.reduce((acc, b) => acc + (b.productCount || 0), 0);

  const openCreateModal = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Brand) => {
    setEditingBrand(b);
    setIsModalOpen(true);
  };

  const handleToggleActive = (b: Brand) => {
    updateMutation.mutate({
      id: b.id,
      data: { active: !b.active },
    });
  };

  const handleDelete = () => {
    if (deletingBrand) {
      deleteMutation.mutate(deletingBrand.id, {
        onSuccess: () => setDeletingBrand(null),
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[#1B9550]" />
            Quản Lý Thương Hiệu & Hãng Sản Xuất
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cấu hình màu sắc nhận diện, danh mục hãng phân phối phụ kiện tủ bếp (GROB, EUPLUS, BLUM, EUROKING...)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1 sm:flex-none justify-center text-xs sm:text-sm font-bold shadow-xs shadow-[#1B9550]/20"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Thêm thương hiệu mới
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white border border-slate-200/80" bodyClassName="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tổng số thương hiệu</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalBrands}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Tag className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80" bodyClassName="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600">Đang hoạt động</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{activeBrandsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#1B9550]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80" bodyClassName="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">Sản phẩm liên kết</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">{totalProducts}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card bodyClassName="p-3 sm:p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm kiếm theo tên hãng, mã thương hiệu hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white text-xs sm:text-sm"
          />
        </div>
      </Card>

      {/* Brands Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-14 text-center">STT</TableHead>
              <TableHead className="w-48">Màu & Nhận diện</TableHead>
              <TableHead>Tên thương hiệu</TableHead>
              <TableHead className="w-32 text-center">Sản phẩm</TableHead>
              <TableHead>Mô tả / Đặc tính</TableHead>
              <TableHead className="w-24 text-center">Thứ tự</TableHead>
              <TableHead className="w-32 text-center">Trạng thái</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                  Đang tải danh sách thương hiệu...
                </TableCell>
              </TableRow>
            ) : filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <EmptyState
                    icon={<Tag className="w-10 h-10" />}
                    title="Chưa tìm thấy thương hiệu nào"
                    description={
                      search
                        ? 'Không có thương hiệu nào khớp với từ khóa tìm kiếm.'
                        : 'Bắt đầu bằng cách thêm thương hiệu mới vào hệ thống.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((b, idx) => (
                <TableRow key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-center font-mono text-xs text-slate-400">
                    {idx + 1}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-lg border border-black/10 shrink-0 shadow-2xs"
                        style={{ backgroundColor: b.color || '#1B9550' }}
                        title={b.color || '#1B9550'}
                      />
                      <BrandBadge brand={b.name} color={b.color} />
                      <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                        {b.color || '#1B9550'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                    {b.code && b.code !== b.name && (
                      <div className="text-[11px] font-mono text-slate-500">Mã: {b.code}</div>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/products`)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Xem danh sách sản phẩm"
                    >
                      <Package className="w-3 h-3 text-slate-500" />
                      <span>{b.productCount ?? 0}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </button>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                      {b.description || <span className="text-slate-300 italic">Chưa có mô tả</span>}
                    </p>
                  </TableCell>

                  <TableCell className="text-center font-mono text-xs text-slate-600">
                    {b.sortOrder}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={b.active}
                        onCheckedChange={() => handleToggleActive(b)}
                        disabled={updateMutation.isPending}
                      />
                      {updateMutation.isPending && updateMutation.variables?.id === b.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                      <span
                        className={`text-[11px] font-semibold ${
                          b.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {b.active ? 'Hoạt động' : 'Tạm ngừng'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Chỉnh sửa thương hiệu"
                        aria-label="Chỉnh sửa thương hiệu"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBrand(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa thương hiệu"
                        aria-label="Xóa thương hiệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Brand Create/Edit Modal */}
      <BrandFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        brand={editingBrand}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deletingBrand}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingBrand(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thương hiệu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thương hiệu{' '}
              <strong>"{deletingBrand?.name}"</strong>? Nếu đang có sản phẩm thuộc hãng này,
              hệ thống sẽ yêu cầu bạn chuyển sang trạng thái "Tạm ngừng" để bảo toàn dữ liệu sản phẩm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
