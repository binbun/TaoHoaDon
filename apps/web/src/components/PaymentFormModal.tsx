import React, { useEffect, useState } from 'react';
import { formatCurrency, formatThousands, parseThousands } from '@taohoadon/shared';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useCreatePayment } from '../hooks';
import { useToast } from '../context/ToastContext';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  quotationId?: string | null;
  quotationNumber?: string;
  suggestedAmount?: number;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  quotationId,
  quotationNumber,
  suggestedAmount = 0,
}) => {
  const { error } = useToast();
  const createMutation = useCreatePayment();

  const [amount, setAmount] = useState<number | string>('');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [note, setNote] = useState('');

  // Reset the form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(suggestedAmount > 0 ? suggestedAmount : '');
      setPaidAt(todayIso());
      setNote('');
    }
  }, [isOpen, suggestedAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount) || 0;
    if (value <= 0) {
      error('Vui lòng nhập số tiền khách thanh toán');
      return;
    }

    createMutation.mutate(
      {
        customerId,
        data: { amount: value, paidAt, note: note.trim() || null, quotationId: quotationId || null },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ghi Nhận Thanh Toán"
      subtitle={quotationNumber ? `Đơn ${quotationNumber}${customerName ? ` · ${customerName}` : ''}` : customerName}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <Input
          label="Số tiền khách trả (đ)"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={formatThousands(amount)}
          onChange={(e) => setAmount(parseThousands(e.target.value))}
          helperText={
            suggestedAmount > 0
              ? `Còn nợ: ${formatCurrency(suggestedAmount)}. Khách trả thiếu thì nhập đúng số đã trả, phần còn lại vẫn được tính là nợ.`
              : undefined
          }
          required
          autoFocus
        />
        <Input
          label="Ngày thanh toán"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
        />
        <Input
          label="Ghi chú"
          placeholder="VD: Chuyển khoản Techcombank, tiền mặt..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {quotationId
            ? 'Số tiền trừ vào đơn này trước; nếu trả dư sẽ trừ tiếp vào nợ đầu kỳ và các đơn cũ nhất, còn dư thì ghi có cho khách.'
            : 'Số tiền trừ vào nợ đầu kỳ trước, sau đó lần lượt các đơn cũ nhất; còn dư thì ghi có cho khách.'}
        </p>

        <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
            Ghi nhận
          </Button>
        </div>
      </form>
    </Modal>
  );
};
