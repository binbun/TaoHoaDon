import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Customer,
  Product,
  Quotation,
  QuotationItemInput,
  calculateQuotationTotals,
  formatCurrency,
} from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Building,
  Calendar,
  Save,
  Eye,
  Search,
  PackagePlus,
  UserPlus,
  Info,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

export const QuotationBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  // Quotation Info State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [title, setTitle] = useState('BÁO GIÁ PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<string>('DRAFT');
  const [note, setNote] = useState(
    '- Toàn bộ phụ kiện Inox SUS304 bảo hành hoen gỉ vĩnh viễn chính hãng EUPLUS.\n- Bảo hành ray trượt giảm chấn, cơ cấu piston nâng hạ thủy lực 02 năm đổi mới.\n- Đơn giá trên là giá phân phối đại lý/công trình, đã tính theo thuế suất VAT 8% hiện hành.\n- Miễn phí vận chuyển nội thành Hà Nội cho đơn hàng từ 5.000.000 ₫.'
  );

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');

  // Items State
  const [items, setItems] = useState<QuotationItemInput[]>([]);

  // Modals
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Fetch Customers & Products
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => apiClient('/customers'),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiClient('/products?active=true'),
  });

  // If Edit Mode, fetch existing quotation
  const { data: existingQuote, isLoading: isLoadingQuote } = useQuery<Quotation>({
    queryKey: ['quotation', id],
    queryFn: () => apiClient(`/quotations/${id}`),
    enabled: isEditMode,
  });

  // Populate data when editing
  useEffect(() => {
    if (existingQuote) {
      setQuotationNumber(existingQuote.quotationNumber);
      setTitle(existingQuote.title);
      setQuotationDate(existingQuote.quotationDate.split('T')[0]);
      setValidUntil(existingQuote.validUntil.split('T')[0]);
      setStatus(existingQuote.status);
      setNote(existingQuote.note || '');
      setSelectedCustomerId(existingQuote.customerId);

      if (existingQuote.customer) {
        setCompanyName(existingQuote.customer.companyName);
        setContactName(existingQuote.customer.contactName || '');
        setEmail(existingQuote.customer.email || '');
        setPhone(existingQuote.customer.phone || '');
        setAddress(existingQuote.customer.address || '');
        setTaxCode(existingQuote.customer.taxCode || '');
      }

      setItems(
        existingQuote.items.map((item, index) => ({
          id: item.id,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          descriptionSnapshot: item.descriptionSnapshot,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: item.vatRate,
          sortOrder: item.sortOrder ?? index,
        }))
      );
    }
  }, [existingQuote]);

  // Handle customer selection change
  const handleSelectCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    const found = customers.find((c) => c.id === cId);
    if (found) {
      setCompanyName(found.companyName);
      setContactName(found.contactName || '');
      setEmail(found.email || '');
      setPhone(found.phone || '');
      setAddress(found.address || '');
      setTaxCode(found.taxCode || '');
    }
  };

  // Add product from catalog
  const handleAddProductFromCatalog = (prod: Product) => {
    const newItem: QuotationItemInput = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      productId: prod.id,
      productNameSnapshot: prod.name,
      descriptionSnapshot: prod.shortDescription || '',
      unit: prod.unit || 'Bộ',
      quantity: 1,
      unitPrice: prod.price,
      discount: 0,
      vatRate: prod.vatRate || 8,
      sortOrder: items.length,
    };
    setItems((prev) => [...prev, newItem]);
    setIsProductPickerOpen(false);
    success(`Đã thêm phụ kiện "${prod.name}" vào báo giá`);
  };

  // Add custom blank item
  const handleAddBlankItem = () => {
    const newItem: QuotationItemInput = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      productId: null,
      productNameSnapshot: '',
      descriptionSnapshot: '',
      unit: 'Bộ',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      vatRate: 8,
      sortOrder: items.length,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof QuotationItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Delete item row
  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Duplicate item row
  const handleDuplicateItem = (index: number) => {
    const source = items[index];
    const duplicated: QuotationItemInput = {
      ...source,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sortOrder: items.length,
    };
    setItems((prev) => [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]);
  };

  // Move item row up/down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  // Real-time calculation using shared logic
  const { calculatedItems, summary } = calculateQuotationTotals(items);

  // Save / Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async (redirectAfterSave: boolean) => {
      // Validate customer
      let finalCustomerId = selectedCustomerId;
      if (!finalCustomerId) {
        if (!companyName.trim()) {
          throw new Error('Vui lòng nhập tên khách hàng / đại lý');
        }
        // Auto create customer
        const newCust = await apiClient<Customer>('/customers', {
          method: 'POST',
          data: {
            companyName: companyName.trim(),
            contactName: contactName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
            taxCode: taxCode.trim() || null,
          },
        });
        finalCustomerId = newCust.id;
      }

      if (items.length === 0) {
        throw new Error('Báo giá phải có ít nhất 1 sản phẩm / phụ kiện');
      }

      // Check item validity
      for (let i = 0; i < items.length; i++) {
        if (!items[i].productNameSnapshot?.trim()) {
          throw new Error(`Dòng số ${i + 1} chưa có tên phụ kiện/sản phẩm`);
        }
        if (items[i].quantity <= 0) {
          throw new Error(`Dòng số ${i + 1} phải có số lượng lớn hơn 0`);
        }
      }

      const payload = {
        quotationNumber: quotationNumber ? quotationNumber.trim() : undefined,
        customerId: finalCustomerId,
        quotationDate,
        validUntil,
        title: title.trim(),
        note: note.trim() || null,
        status,
        items: items.map((item, index) => ({
          productId: item.productId || null,
          productNameSnapshot: item.productNameSnapshot.trim(),
          descriptionSnapshot: item.descriptionSnapshot?.trim() || null,
          unit: item.unit?.trim() || 'Bộ',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          vatRate: Number(item.vatRate) || 8,
          sortOrder: index,
        })),
      };

      let result: Quotation;
      if (isEditMode) {
        result = await apiClient<Quotation>(`/quotations/${id}`, {
          method: 'PATCH',
          data: payload,
        });
      } else {
        result = await apiClient<Quotation>('/quotations', {
          method: 'POST',
          data: payload,
        });
      }

      return { result, redirectAfterSave };
    },
    onSuccess: ({ result, redirectAfterSave }) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success(isEditMode ? 'Cập nhật báo giá thành công!' : 'Tạo báo giá thành công!');
      if (redirectAfterSave) {
        navigate(`/quotations/${result.id}/preview`);
      } else {
        navigate('/quotations');
      }
    },
    onError: (err: any) => {
      error(err.message || 'Lưu báo giá thất bại, vui lòng kiểm tra lại');
    },
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.shortDescription && p.shortDescription.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/quotations')}
          >
            Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEditMode ? `Chỉnh Sửa Báo Giá ${quotationNumber || ''}` : 'Tạo Báo Giá Phụ Kiện Tủ Bếp Mới'}
            </h1>
            <p className="text-xs text-slate-500">
              Điền thông tin đại lý/công trình, chọn phụ kiện EUPLUS và kiểm tra tổng chi phí
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => saveMutation.mutate(false)}
            isLoading={saveMutation.isPending}
          >
            Lưu danh sách
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => saveMutation.mutate(true)}
            isLoading={saveMutation.isPending}
          >
            Lưu & Xem Preview
          </Button>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Left Form (8 cols) + Right Financial Summary (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Forms & Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Customer Information */}
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-slate-900">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-base">1. Thông Tin Khách Hàng / Đại Lý / Công Trình</span>
                </div>
                {customers.length > 0 && (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="text-xs bg-blue-50/70 border border-blue-200 text-blue-800 rounded-lg px-3 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn khách hàng / đại lý có sẵn --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.contactName || 'Chưa có tên đại diện'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            }
          >
            <div className="space-y-4">
              <Input
                label="Tên Khách Hàng / Công Ty / Đại Lý"
                placeholder="VD: Công ty Cổ phần Xây Dựng & Nội Thất HomeDecor"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setSelectedCustomerId('');
                }}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Người liên hệ đại diện"
                  placeholder="VD: KTS. Nguyễn Tuấn Anh"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  label="Mã số thuế (nếu có)"
                  placeholder="VD: 0108668899"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Số điện thoại"
                  placeholder="VD: 0988 567 890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Email nhận báo giá"
                  type="email"
                  placeholder="VD: tuananh@homedecor.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Input
                label="Địa chỉ công trình / giao hàng"
                placeholder="VD: Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Bắc Từ Liêm, Hà Nội"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </Card>

          {/* Section 2: Quotation Metadata */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-900">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-base">2. Thông Tin Báo Giá</span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Số báo giá (Tự động)"
                  placeholder="BG-2026-XXXX"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  helperText="Hệ thống tự sinh mã liên tiếp nếu để trống"
                />
                <Input
                  label="Ngày báo giá"
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  required
                />
                <Input
                  label="Ngày hết hạn hiệu lực"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Tiêu đề báo giá"
                    placeholder="VD: BÁO GIÁ PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">Bản nháp (Draft)</option>
                    <option value="SENT">Đã gửi khách (Sent)</option>
                    <option value="ACCEPTED">Đã chấp thuận (Accepted)</option>
                    <option value="REJECTED">Bị từ chối (Rejected)</option>
                    <option value="EXPIRED">Đã hết hạn (Expired)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Products / Items Table */}
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-base">3. Danh Sách Phụ Kiện & Thiết Bị ({items.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleAddBlankItem}
                  >
                    Thêm dòng trống
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
                    onClick={() => setIsProductPickerOpen(true)}
                  >
                    + Chọn từ Catalogue EUPLUS
                  </Button>
                </div>
              </div>
            }
          >
            {items.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <PackagePlus className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">Chưa có phụ kiện nào trong báo giá</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Chọn phụ kiện từ catalogue EUPLUS (giá bát nâng hạ, giá xoong nồi, giá dao thớt, thùng gạo...)
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsProductPickerOpen(true)}
                  >
                    Chọn từ Catalogue EUPLUS
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankItem}
                  >
                    Thêm dòng trống
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => {
                  const calculatedRow = calculatedItems[index] || item;
                  return (
                    <div
                      key={item.id || index}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group"
                    >
                      {/* Row Top: STT, Product Name, Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Phụ kiện #{index + 1}
                          </span>
                        </div>

                        {/* Reorder & Row Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === items.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(index)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Nhân bản dòng này"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Name & Short Description Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8">
                          <Input
                            placeholder="Tên phụ kiện / thiết bị tủ bếp *"
                            value={item.productNameSnapshot}
                            onChange={(e) => handleItemChange(index, 'productNameSnapshot', e.target.value)}
                            required
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <Input
                            placeholder="Đơn vị tính (Bộ, Chiếc, Mét dài, Hệ...)"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <textarea
                          rows={1}
                          placeholder="Mô tả quy cách, kích thước, chất liệu Inox 304, xuất xứ..."
                          value={item.descriptionSnapshot || ''}
                          onChange={(e) => handleItemChange(index, 'descriptionSnapshot', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      {/* Numeric Inputs: Qty, Unit Price, Discount, VAT, Row Total */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Số lượng
                          </label>
                          <Input
                            type="number"
                            min="0.01"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            className="text-right font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Đơn giá phân phối (đ)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                            className="text-right font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Chiết khấu (đ)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                            className="text-right text-rose-600 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Thuế VAT (%)
                          </label>
                          <select
                            value={item.vatRate}
                            onChange={(e) => handleItemChange(index, 'vatRate', Number(e.target.value))}
                            className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                          </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1 bg-white p-2 rounded-lg border border-slate-200 text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Thành tiền</div>
                          <div className="font-extrabold text-slate-900 text-sm truncate">
                            {formatCurrency(calculatedRow.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Section 4: Notes & Terms */}
          <Card title="4. Chính Sách Bảo Hành & Điều Khoản Báo Giá">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập các điều khoản về bảo hành Inox 304, vận chuyển, lắp đặt và thanh toán..."
              className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Card>
        </div>

        {/* Right 4 Columns: Sticky Summary Card */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <Card className="border-t-4 border-t-blue-600 shadow-md">
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Tổng Kết Báo Giá EUPLUS</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {items.length} hạng mục
              </span>
            </h3>

            <div className="space-y-3 py-4 text-sm divide-y divide-slate-100">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tạm tính (Subtotal):</span>
                <span className="font-bold text-slate-900">{formatCurrency(summary.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-rose-600 pt-3">
                <span>Chiết khấu (Discount):</span>
                <span className="font-bold">-{formatCurrency(summary.discountTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-700 pt-3 font-medium">
                <span>Tiền trước VAT:</span>
                <span className="font-bold">{formatCurrency(summary.taxableTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 pt-3">
                <span>Tiền thuế VAT:</span>
                <span className="font-bold text-slate-900">{formatCurrency(summary.vatTotal)}</span>
              </div>

              <div className="pt-4">
                <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    TỔNG CỘNG THANH TOÁN
                  </span>
                  <span className="text-2xl font-black text-blue-700">
                    {formatCurrency(summary.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <Button
                type="button"
                variant="primary"
                className="w-full py-2.5 font-bold shadow-md shadow-blue-500/20"
                leftIcon={<Eye className="w-4 h-4" />}
                onClick={() => saveMutation.mutate(true)}
                isLoading={saveMutation.isPending}
              >
                Lưu & Xem Trước Báo Giá
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => saveMutation.mutate(false)}
                isLoading={saveMutation.isPending}
              >
                Lưu lại danh sách
              </Button>
            </div>
          </Card>

          {/* Quick Help Card */}
          <div className="p-4 bg-slate-100/80 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Tiêu chuẩn phụ kiện EUPLUS</span>
            </div>
            <p className="leading-relaxed">
              Các phụ kiện Inox 304 đều được bảo hành han gỉ vĩnh viễn và đi kèm đầy đủ bộ phụ kiện lắp đặt, ốc vít và ray âm giảm chấn chính hãng.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Pick Products from Catalog */}
      <Modal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        title="Chọn Phụ Kiện Từ Catalogue EUPLUS"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <Input
            placeholder="Tìm theo tên hoặc mã phụ kiện (EV.I80, EV.80B, EV.35, B30.1...)"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProductFromCatalog(p)}
                  className="p-3.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 text-sm">
                        {p.name}
                      </span>
                    </div>
                    {p.shortDescription && (
                      <p className="text-xs text-slate-500 max-w-lg line-clamp-1">
                        {p.shortDescription}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 pl-4">
                    <div className="font-extrabold text-slate-900 text-sm">
                      {formatCurrency(p.price)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      VAT {p.vatRate}% • {p.unit}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                Không tìm thấy phụ kiện nào khớp với từ khóa tìm kiếm.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsProductPickerOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
