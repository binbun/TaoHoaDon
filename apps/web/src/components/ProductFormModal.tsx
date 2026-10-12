import React, { useState, useEffect, useMemo } from 'react';
import { Product, formatThousands, parseThousands } from '@taohoadon/shared';
import { useCreateProduct, useUpdateProduct } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useToast } from '../context/ToastContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Switch } from './ui/switch';
import { BrandBadge } from './BrandBadge';
import { Star } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  defaultBrand?: string;
  defaultCategory?: string;
}

export interface ProductFormData {
  code: string;
  oldCode: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string;
  cabinetWidth: string;
  dimensions: string;
  unit: string;
  price: number | string;
  vatRate: number | string;
  active: boolean;
  isFavorite: boolean;
}

const getInitialFormData = (brand = 'GROB', category = 'Phụ kiện tủ bếp'): ProductFormData => ({
  code: '',
  oldCode: '',
  name: '',
  brand: brand === 'Tất cả' ? 'GROB' : brand,
  category: category || 'Phụ kiện tủ bếp',
  shortDescription: '',
  cabinetWidth: '',
  dimensions: '',
  unit: 'Bộ',
  price: 0,
  vatRate: 0,
  active: true,
  isFavorite: false,
});

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  defaultBrand,
  defaultCategory,
}) => {
  const { error } = useToast();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: brands = [] } = useBrands();

  const brandList = useMemo(() => {
    if (brands && brands.length > 0) return brands;
    return [
      { id: '1', name: 'GROB', color: '#1B9550', description: 'Inox 304 GROB' },
      { id: '2', name: 'EUPLUS', color: '#0D4EA0', description: 'Thiết bị & phụ kiện EUPLUS' },
      { id: '3', name: 'BLUM', color: '#FF6724', description: 'Tay nâng & bản lề BLUM' },
      { id: '4', name: 'EUROKING', color: '#1C4C8F', description: 'Phụ kiện tủ bếp EUROKING' },
      { id: '5', name: 'KINGENBLU', color: '#247948', description: 'Phụ kiện KINGENBLU' },
    ];
  }, [brands]);

  const [formData, setFormData] = useState<ProductFormData>(() =>
    getInitialFormData(defaultBrand, defaultCategory)
  );

  const currentBrandObj = useMemo(() => {
    return brandList.find((b) => b.name === formData.brand);
  }, [brandList, formData.brand]);

  // Sync state whenever modal opens or editing product changes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          code: product.code,
          oldCode: product.oldCode || '',
          name: product.name,
          brand: product.brand || 'GROB',
          category: product.category || 'Khác',
          shortDescription: product.shortDescription || '',
          cabinetWidth: product.cabinetWidth || '',
          dimensions: product.dimensions || '',
          unit: product.unit || 'Bộ',
          price: product.price,
          vatRate: product.vatRate ?? 0,
          active: product.active,
          isFavorite: product.isFavorite ?? false,
        });
      } else {
        setFormData(getInitialFormData(defaultBrand, defaultCategory));
      }
    }
  }, [isOpen, product, defaultBrand, defaultCategory]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      error('Vui lòng nhập đầy đủ mã và tên sản phẩm');
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      oldCode: formData.oldCode.trim() ? formData.oldCode.trim().toUpperCase() : null,
      name: formData.name.trim(),
      brand: formData.brand.trim() || 'GROB',
      category: formData.category.trim() || 'Khác',
      shortDescription: formData.shortDescription.trim() || null,
      cabinetWidth: formData.cabinetWidth.trim() || null,
      dimensions: formData.dimensions.trim() || null,
      unit: formData.unit.trim() || 'Bộ',
      price: Number(formData.price) || 0,
      vatRate: Number(formData.vatRate) || 0,
      active: formData.active,
      isFavorite: formData.isFavorite,
    };

    if (product) {
      updateMutation.mutate(
        { id: product.id, data: payload },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: onClose,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Mã hàng chính"
            placeholder="VD: C1EC.70B, EV.I80..."
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            required
          />
          <Input
            label="Mã cũ (Catalogue)"
            placeholder="VD: GP1-70..."
            value={formData.oldCode}
            onChange={(e) => handleChange('oldCode', e.target.value)}
          />
          <Input
            label="Đơn vị tính"
            placeholder="Bộ, Cái, 1 CẶP, Mét dài..."
            value={formData.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Hãng / Thương hiệu *
              </label>
              {formData.brand && (
                <BrandBadge brand={formData.brand} color={currentBrandObj?.color} />
              )}
            </div>

            <select
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B9550] cursor-pointer"
              required
            >
              {formData.brand && !brandList.some((b) => b.name === formData.brand) && (
                <option value={formData.brand}>{formData.brand}</option>
              )}
              {brandList.map((b) => (
                <option key={b.id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Danh mục phân loại
            </label>
            <input
              type="text"
              list="categorySuggestions"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Giá bát đĩa, Tủ đồ khô..."
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B9550]"
              required
            />
            <datalist id="categorySuggestions">
              <option value="Phụ kiện tự động thông minh" />
              <option value="Giá dao thớt & gia vị" />
              <option value="Giá xoong nồi & bát đĩa" />
              <option value="Tủ đồ khô" />
              <option value="Kệ góc & mâm xoay" />
              <option value="Giá bát cố định & nâng hạ cơ" />
              <option value="Thùng gạo" />
              <option value="Thùng rác" />
              <option value="Khay chia thìa dĩa" />
              <option value="Phụ kiện tủ áo" />
              <option value="Ray - Bản lề - Tay nâng" />
              <option value="Bếp từ & bếp gas" />
              <option value="Máy hút mùi" />
              <option value="Chậu & vòi rửa" />
            </datalist>
          </div>
        </div>

        <Input
          label="Tên sản phẩm / Quy cách"
          placeholder="VD: Giá bát nâng hạ thông minh SUS304 - KT 800"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Khoang tủ (mm)"
            placeholder="VD: 700, 800, 900..."
            value={formData.cabinetWidth}
            onChange={(e) => handleChange('cabinetWidth', e.target.value)}
          />
          <Input
            label="Kích thước lắp đặt (R*S*C)"
            placeholder="VD: W665*D300*H≥650"
            value={formData.dimensions}
            onChange={(e) => handleChange('dimensions', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Mô tả chi tiết / Đặc tính & bảo hành
          </label>
          <textarea
            rows={2}
            maxLength={500}
            placeholder="Inox 304 bảo hành gỉ vĩnh viễn, ray giảm chấn, bảo hành 24 tháng..."
            value={formData.shortDescription}
            onChange={(e) => handleChange('shortDescription', e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B9550]"
          />
        </div>

        <div>
          <Input
            label="Đơn Giá Phân Phối / Đại Lý (đ)"
            type="text"
            inputMode="numeric"
            placeholder="VD: 1.486.000"
            value={formatThousands(formData.price)}
            onChange={(e) => handleChange('price', parseThousands(e.target.value))}
            required
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Switch
            id="activeSwitch"
            checked={formData.active}
            onCheckedChange={(checked) => handleChange('active', checked)}
          />
          <label htmlFor="activeSwitch" className="text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer">
            Kích hoạt sử dụng sản phẩm này trong tạo đơn hàng
          </label>
        </div>

        <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <Switch
            id="favoriteSwitch"
            checked={formData.isFavorite}
            onCheckedChange={(checked) => handleChange('isFavorite', checked)}
          />
          <label htmlFor="favoriteSwitch" className="text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>Đánh dấu là sản phẩm yêu thích (Ưu tiên hiển thị khi lên đơn)</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
