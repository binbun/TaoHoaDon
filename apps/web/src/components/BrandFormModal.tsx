import React, { useState, useEffect } from 'react';
import { Brand } from '@taohoadon/shared';
import { useCreateBrand, useUpdateBrand } from '../hooks/useBrands';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Switch } from './ui/switch';
import { BrandBadge } from './BrandBadge';
import { ColorPickerInput } from './ColorPickerInput';
import { useToast } from '../context/ToastContext';

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: Brand | null;
}

export const BrandFormModal: React.FC<BrandFormModalProps> = ({
  isOpen,
  onClose,
  brand,
}) => {
  const { error } = useToast();
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#1B9550');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (brand) {
        setName(brand.name);
        setCode(brand.code || brand.name);
        setColor(brand.color || '#1B9550');
        setDescription(brand.description || '');
        setSortOrder(brand.sortOrder ?? 0);
        setActive(brand.active ?? true);
      } else {
        setName('');
        setCode('');
        setColor('#1B9550');
        setDescription('');
        setSortOrder(0);
        setActive(true);
      }
    }
  }, [isOpen, brand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Vui lòng nhập tên thương hiệu');
      return;
    }

    const payload = {
      name: name.trim().toUpperCase(),
      code: code.trim() ? code.trim().toUpperCase() : name.trim().toUpperCase(),
      color: color.trim() || '#1B9550',
      description: description.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      active,
    };

    if (brand) {
      updateMutation.mutate(
        { id: brand.id, data: payload },
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
      title={brand ? 'Chỉnh Sửa Thương Hiệu' : 'Thêm Thương Hiệu Mới'}
      subtitle="Quản lý màu sắc nhận diện và tên hãng sản xuất phụ kiện"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live Badge Preview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Xem trước hiển thị:</span>
          <div className="flex items-center gap-2">
            <BrandBadge brand={name || 'TÊN HÃNG'} color={color} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Tên thương hiệu *"
            placeholder="VD: GROB, BLUM, BOSCH..."
            value={name}
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              if (!brand && !code) {
                setCode(val.toUpperCase());
              }
            }}
            required
            autoFocus
          />

          <Input
            label="Mã hãng viết tắt"
            placeholder="VD: GROB, BLUM..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>

        {/* Color Picker Input with react-colorful */}
        <ColorPickerInput
          label="Màu sắc nhận diện thương hiệu"
          color={color}
          onChange={setColor}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Mô tả thương hiệu / Đặc tính
          </label>
          <textarea
            rows={2}
            placeholder="VD: Bản lề & ray trượt nhập khẩu Áo, Inox SUS304..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B9550]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <Input
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          />

          <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-5">
            <Switch
              id="brandActiveSwitch"
              checked={active}
              onCheckedChange={setActive}
            />
            <label
              htmlFor="brandActiveSwitch"
              className="text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Kích hoạt thương hiệu
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {brand ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
