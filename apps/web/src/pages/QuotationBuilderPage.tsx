import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCustomers,
  useProducts,
  useQuotation,
  useCreateQuotation,
  useUpdateQuotation,
  useCreateCustomer,
} from '../hooks';
import {
  Product,
  QuotationItemInput,
  calculateQuotationTotals,
  formatCurrency,
  formatThousands,
  parseThousands,
} from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
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
  Info,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

export const QuotationBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Quotation Info State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [title, setTitle] = useState('ĐƠN HÀNG PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('DRAFT');
  const [previousDebt, setPreviousDebt] = useState<number | string>(0);
  const [note, setNote] = useState(
    '- Toàn bộ phụ kiện Inox SUS304 bảo hành hoen gỉ vĩnh viễn chính hãng EUPLUS.\n- Bảo hành ray trượt giảm chấn, cơ cấu piston nâng hạ thủy lực 02 năm đổi mới.\n- Miễn phí vận chuyển nội thành Hà Nội cho đơn hàng từ 5.000.000 ₫.'
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

  // Custom Hooks
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts({ active: true });
  const { data: existingQuote } = useQuotation(id);

  const createQuotationMutation = useCreateQuotation();
  const updateQuotationMutation = useUpdateQuotation();
  const createCustomerMutation = useCreateCustomer();

  const isSaving =
    createQuotationMutation.isPending ||
    updateQuotationMutation.isPending ||
    createCustomerMutation.isPending;

  // Populate data when editing
  useEffect(() => {
    if (existingQuote) {
      setQuotationNumber(existingQuote.quotationNumber);
      setTitle(existingQuote.title);
      setQuotationDate(existingQuote.quotationDate.split('T')[0]);
      setStatus(existingQuote.status);
      setPreviousDebt(existingQuote.previousDebt ?? 0);
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
          vatRate: item.vatRate ?? 0,
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

  // Add product from catalog (Default VAT is 0%)
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
      vatRate: prod.vatRate ?? 0,
      sortOrder: items.length,
    };
    setItems((prev) => [...prev, newItem]);
    success(`Đã thêm: ${prod.name}`);
  };

  // Add blank custom item (Default VAT is 0%)
  const handleAddBlankItem = () => {
    const newItem: QuotationItemInput = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      productNameSnapshot: '',
      descriptionSnapshot: '',
      unit: 'Bộ',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      vatRate: 0,
      sortOrder: items.length,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Item modifications
  const handleItemChange = (index: number, field: keyof QuotationItemInput, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDuplicateItem = (index: number) => {
    const target = items[index];
    const duplicated: QuotationItemInput = {
      ...target,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sortOrder: index + 1,
    };
    const next = [...items];
    next.splice(index + 1, 0, duplicated);
    setItems(next);
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setItems(next);
  };

  // Calculate live totals including previous debt
  const { summary, calculatedItems } = calculateQuotationTotals(
    items.map((it, idx) => ({
      ...it,
      sortOrder: idx,
    })),
    Number(previousDebt) || 0
  );

  // Save Quotation
  const handleSave = async (redirectToPreview = false) => {
    if (!companyName.trim()) {
      error('Vui lòng nhập tên công ty hoặc khách hàng');
      return;
    }

    if (items.length === 0) {
      error('Vui lòng thêm ít nhất 1 phụ kiện vào đơn hàng');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productNameSnapshot.trim()) {
        error(`Dòng thứ ${i + 1} chưa có tên phụ kiện`);
        return;
      }
    }

    try {
      let customerId = selectedCustomerId;

      // If new customer name typed and not picked from list, create or link
      if (!customerId) {
        const newCust = await createCustomerMutation.mutateAsync({
          companyName: companyName.trim(),
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          taxCode: taxCode.trim() || undefined,
        });
        customerId = newCust.id;
        setSelectedCustomerId(customerId);
      }

      const payload = {
        quotationNumber: quotationNumber.trim() || undefined,
        title: title.trim(),
        quotationDate,
        status: status as any,
        previousDebt: Number(previousDebt) || 0,
        note: note.trim() || undefined,
        customerId,
        items: items.map((it, idx) => ({
          productId: it.productId || undefined,
          productNameSnapshot: it.productNameSnapshot.trim(),
          descriptionSnapshot: it.descriptionSnapshot?.trim() || undefined,
          unit: it.unit?.trim() || 'Bộ',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          vatRate: Number(it.vatRate) || 0,
          sortOrder: idx,
        })),
      };

      if (isEditMode && id) {
        const res = await updateQuotationMutation.mutateAsync({ id, data: payload });
        success('Đã cập nhật đơn hàng thành công');
        if (redirectToPreview) {
          navigate(`/quotations/${res.id}/preview`);
        } else {
          navigate('/quotations');
        }
      } else {
        const res = await createQuotationMutation.mutateAsync(payload);
        success('Đã tạo mới đơn hàng thành công');
        if (redirectToPreview) {
          navigate(`/quotations/${res.id}/preview`);
        } else {
          navigate('/quotations');
        }
      }
    } catch (err: any) {
      error(err.message || 'Không thể lưu đơn hàng, vui lòng thử lại');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/quotations')}
          >
            Danh sách
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {isEditMode ? `Chỉnh Sửa Đơn Hàng #${quotationNumber || id}` : 'Tạo Đơn Hàng Mới'}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
              Tiêu chuẩn phụ kiện tủ bếp thông minh EUPLUS
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial justify-center"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => handleSave(false)}
            isLoading={isSaving}
          >
            Lưu lại
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1 sm:flex-initial justify-center shadow-xs"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => handleSave(true)}
            isLoading={isSaving}
          >
            Lưu & Xem Trước
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left 8 Columns: Form and Items */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          {/* Section 1: Customer Info */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-900">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-base">1. Thông Tin Khách Hàng / Đối Tác</span>
              </div>
            }
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Quick Pick Existing Customer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chọn nhanh khách hàng đã lưu
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Nhập thông tin khách hàng mới --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} {c.contactName ? `(${c.contactName})` : ''} - {c.phone || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Tên Công Ty / Tên Khách Hàng *"
                  placeholder="VD: Cty TNHH Nội Thất Minh Quân"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <Input
                  label="Người liên hệ đại diện"
                  placeholder="VD: Anh Tuấn Anh"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Số điện thoại"
                  placeholder="VD: 0988 567 890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Mã số thuế (nếu có)"
                  placeholder="VD: 0108992345"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Email nhận đơn hàng"
                  type="email"
                  placeholder="VD: tuananh@homedecor.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Địa chỉ công trình / giao hàng"
                  placeholder="VD: Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Hà Nội"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Quotation Metadata & Previous Debt */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-900">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-base">2. Thông Tin Đơn Hàng & Dư Nợ Cũ</span>
              </div>
            }
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Số đơn hàng (Tự động)"
                  placeholder="DH-2026-XXXX"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  helperText="Tự sinh nếu để trống"
                />
                <Input
                  label="Ngày tạo đơn"
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Tiêu đề đơn hàng"
                    placeholder="VD: ĐƠN HÀNG PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS"
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
                    value={status === 'ACCEPTED' ? 'PAID' : status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">Bản nháp (Draft)</option>
                    <option value="SENT">Đã gửi (Sent)</option>
                    <option value="PAID">Đã thanh toán (Paid)</option>
                  </select>
                </div>
              </div>

              {/* Previous Debt Field */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                <Input
                  label="Dư nợ cũ từ các đơn trước (đ)"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousands(previousDebt)}
                  onChange={(e) => setPreviousDebt(parseThousands(e.target.value))}
                  helperText="Số tiền khách hàng/đại lý còn nợ từ các đơn trước (nếu có, sẽ tự động cộng vào Tổng cộng thanh toán)"
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Products / Items Table */}
          <Card
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-base">3. Danh Sách Phụ Kiện ({items.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2.5 py-1.5"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleAddBlankItem}
                  >
                    Dòng trống
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="text-xs px-2.5 py-1.5"
                    leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
                    onClick={() => setIsProductPickerOpen(true)}
                  >
                    Catalogue EUPLUS
                  </Button>
                </div>
              </div>
            }
          >
            {items.length === 0 ? (
              <div className="p-6 sm:p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <PackagePlus className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">Chưa có phụ kiện nào trong đơn hàng</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Chọn phụ kiện từ catalogue EUPLUS (giá bát nâng hạ, giá xoong nồi, giá dao thớt, thùng gạo...)
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2.5">
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
              <div className="space-y-3 sm:space-y-4">
                {items.map((item, index) => {
                  const calculatedRow = calculatedItems[index];
                  return (
                    <div
                      key={item.id || index}
                      className="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group"
                    >
                      {/* Row Top Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Phụ kiện #{index + 1}
                          </span>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 active:scale-95"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === items.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 active:scale-95"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(index)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 active:scale-95"
                            title="Nhân bản dòng này"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 active:scale-95"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
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
                            placeholder="ĐVT (Bộ, Chiếc, Mét dài...)"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Numeric Inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-1 items-end">
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
                            Đơn giá (đ)
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={formatThousands(item.unitPrice)}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseThousands(e.target.value))}
                            className="text-right font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Chiết khấu (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="0"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            className="text-right text-rose-600 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Thuế VAT (%)
                          </label>
                          <select
                            value={item.vatRate ?? 0}
                            onChange={(e) => handleItemChange(index, 'vatRate', Number(e.target.value))}
                            className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="0">0%</option>
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                            <option value="5">5%</option>
                          </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1 bg-white p-2 rounded-lg border border-slate-200 text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Thành tiền</div>
                          <div className="font-extrabold text-slate-900 text-sm truncate">
                            {formatCurrency(calculatedRow?.total ?? 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Section 4: Notes */}
          <Card title="4. Chính Sách Bảo Hành & Điều Khoản Đơn Hàng">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập các điều khoản về bảo hành Inox 304, vận chuyển, lắp đặt và thanh toán..."
              className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Card>
        </div>

        {/* Right 4 Columns: Summary Panel (Desktop sticky, Mobile inline) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <Card className="border-t-4 border-t-blue-600 shadow-md">
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Tổng Kết Đơn Hàng EUPLUS</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {items.length} hạng mục
              </span>
            </h3>

            <div className="space-y-3 py-4 text-sm divide-y divide-slate-100">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tiền hàng (Tạm tính):</span>
                <span className="font-bold text-slate-900">{formatCurrency(summary.subtotal)}</span>
              </div>

              {summary.discountTotal > 0 && (
                <div className="flex items-center justify-between text-rose-600 pt-3">
                  <span>Chiết khấu (Discount):</span>
                  <span className="font-bold">-{formatCurrency(summary.discountTotal)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-700 pt-3 font-medium">
                <span>Tiền trước VAT:</span>
                <span className="font-bold">{formatCurrency(summary.taxableTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 pt-3">
                <span>Tiền thuế VAT:</span>
                <span className="font-bold text-slate-900">{formatCurrency(summary.vatTotal)}</span>
              </div>

              {Number(previousDebt) > 0 && (
                <div className="flex items-center justify-between text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200/80 pt-2.5 font-medium">
                  <span>Dư nợ cũ:</span>
                  <span className="font-bold text-amber-700">+{formatCurrency(Number(previousDebt))}</span>
                </div>
              )}

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
                className="w-full py-2.5 font-bold shadow-md shadow-blue-500/20 justify-center"
                leftIcon={<Eye className="w-4 h-4" />}
                onClick={() => handleSave(true)}
                isLoading={isSaving}
              >
                Lưu & Xem Trước Đơn Hàng
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => handleSave(false)}
                isLoading={isSaving}
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
        <div className="space-y-3 sm:space-y-4">
          <Input
            placeholder="Tìm theo tên hoặc mã phụ kiện (EV.I80, EV.80B, EV.35, B30.1...)"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />

          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProductFromCatalog(p)}
                  className="p-3 sm:p-3.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">
                        {p.code}
                      </span>
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 text-sm truncate">
                        {p.name}
                      </span>
                    </div>
                    {p.shortDescription && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {p.shortDescription}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="font-extrabold text-slate-900 text-sm whitespace-nowrap">
                      {formatCurrency(p.price)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      VAT {p.vatRate || 0}% • {p.unit}
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
