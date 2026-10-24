import React, { useEffect, useState } from 'react';
import { formatCurrency, formatThousands, parseThousands } from '@taohoadon/shared';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useCreatePayment } from '../hooks';
import { useToast } from '../context/ToastContext';
import { todayDay } from '../lib/utils';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  quotationId?: string | null;
  quotationNumber?: string;
  suggestedAmount?: number;
  maxAmount: number; // the customer's current debt: customers never pay more than they owe
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  quotationId,
  quotationNumber,
  suggestedAmount = 0,
  maxAmount,
}) => {
  const { error } = useToast();
  const createMutation = useCreatePayment();

  const [amount, setAmount] = useState<number | string>('');
  const [paidAt, setPaidAt] = useState(todayDay());
  const [note, setNote] = useState('');

  // Reset the form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      const suggested = Math.min(suggestedAmount, maxAmount);
      setAmount(suggested > 0 ? suggested : '');
      setPaidAt(todayDay());
      setNote('');
    }
  }, [isOpen, suggestedAmount, maxAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount) || 0;
    if (value <= 0) {
      error('Vui lòng nhập số tiền khách thanh toán');
      return;
    }
    if (value > maxAmount) {
      error(`Số tiền vượt quá tổng nợ hiện tại của khách (${formatCurrency(maxAmount)})`);
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
          helperText={`${
            quotationId && suggestedAmount > 0 ? `Đơn này còn nợ: ${formatCurrency(suggestedAmount)}. ` : ''
          }Tổng nợ của khách: ${formatCurrency(maxAmount)}, không nhập quá số này. Khách trả thiếu thì nhập đúng số đã trả, phần còn lại vẫn được tính là nợ.`}
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
            ? 'Số tiền trừ vào đơn này trước, phần còn lại trừ vào nợ đầu kỳ rồi lần lượt các đơn cũ nhất.'
            : 'Số tiền trừ vào nợ đầu kỳ trước, sau đó lần lượt các đơn cũ nhất.'}
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
