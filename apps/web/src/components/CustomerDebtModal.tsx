import React, { useState } from 'react';
import { Customer, Payment, formatCurrency, formatDate } from '@taohoadon/shared';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { Skeleton } from './Skeleton';
import { PaymentFormModal } from './PaymentFormModal';
import { useCustomerDebt, useDeletePayment } from '../hooks';

// Rows from one payment share a batchId; show them as a single entry
function groupPayments(payments: Payment[]) {
  const groups: { batchId: string; paidAt: string; note?: string | null; total: number; parts: Payment[] }[] = [];
  for (const p of payments) {
    const group = groups.find((g) => g.batchId === p.batchId);
    if (group) {
      group.total += p.amount;
      group.parts.push(p);
    } else {
      groups.push({ batchId: p.batchId, paidAt: p.paidAt, note: p.note, total: p.amount, parts: [p] });
    }
  }
  return groups;
}

interface PaymentHistoryProps {
  customerId: string;
  payments: Payment[];
  emptyText?: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  customerId,
  payments,
  emptyText = 'Chưa có khoản thanh toán nào',
}) => {
  const deleteMutation = useDeletePayment();
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const groups = groupPayments(payments);

  if (groups.length === 0) {
    return <p className="text-xs text-slate-400 py-2">{emptyText}</p>;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {groups.map((g) => (
          <li key={g.batchId} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 text-xs">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(g.total)}</span>
                <span className="text-slate-500">{formatDate(g.paidAt)}</span>
              </div>
              {g.note && <div className="text-slate-600 mt-0.5 break-words">{g.note}</div>}
              <div className="text-[11px] text-slate-400 mt-0.5">
                {g.parts
                  .map((p) => `${p.quotation?.quotationNumber || 'Nợ đầu kỳ / ghi có'}: ${formatCurrency(p.amount)}`)
                  .join(' · ')}
              </div>
            </div>
            <button
              type="button"
              aria-label="Xóa khoản thanh toán"
              title="Xóa khoản thanh toán"
              onClick={() => setDeletingBatchId(g.batchId)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={!!deletingBatchId}
        onClose={() => setDeletingBatchId(null)}
        onConfirm={() =>
          deletingBatchId &&
          deleteMutation.mutate(
            { customerId, batchId: deletingBatchId },
            { onSuccess: () => setDeletingBatchId(null) }
          )
        }
        title="Xóa khoản thanh toán"
        message="Khoản thanh toán này sẽ bị xóa và số nợ của khách được tính lại. Nếu tiền đã được chia cho nhiều đơn, tất cả phần chia đều bị xóa."
        confirmText="Xóa"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

interface CustomerDebtModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerDebtModal: React.FC<CustomerDebtModalProps> = ({ customer, onClose }) => {
  const { data: debt, isLoading } = useCustomerDebt(customer?.id);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const unpaidOrders = debt?.orders.filter((o) => o.remaining > 0) ?? [];
  const currentDebt = debt?.currentDebt ?? 0;

  return (
    <>
      <Modal
        isOpen={!!customer}
        onClose={onClose}
        title="Công Nợ Khách Hàng"
        subtitle={customer?.companyName}
        maxWidth="2xl"
      >
        {isLoading || !debt ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                  {currentDebt < 0 ? 'Khách trả dư (ghi có)' : 'Dư nợ hiện tại'}
                </div>
                <div className="text-xl font-black text-amber-700 mt-1">{formatCurrency(Math.abs(currentDebt))}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between gap-2">
                  <span>Nợ đầu kỳ:</span>
                  <strong className="text-slate-900">{formatCurrency(debt.openingDebt)}</strong>
                </div>
                {debt.openingFromQuotation && (
                  <div className="text-[11px] text-slate-400 -mt-0.5">
                    Lấy từ "Dư nợ cũ" của đơn đầu tiên {debt.openingFromQuotation.quotationNumber}
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span>Nợ đầu kỳ còn lại:</span>
                  <strong className="text-slate-900">{formatCurrency(debt.openingRemaining)}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Đơn còn nợ:</span>
                  <strong className="text-slate-900">{unpaidOrders.length}</strong>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full sm:w-auto justify-center"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsPaymentOpen(true)}
            >
              Ghi nhận thanh toán
            </Button>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Đơn hàng còn nợ</h3>
              {unpaidOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Không có đơn nào còn nợ</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {unpaidOrders.map((o) => (
                    <li key={o.id}>
                      <a
                        href={`/quotations/${o.id}/preview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Mở đơn hàng trong tab mới"
                        className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-left text-xs hover:bg-slate-50"
                      >
                        <span>
                          <span className="font-bold text-slate-900">{o.quotationNumber}</span>
                          <span className="text-slate-500 ml-2">{formatDate(o.quotationDate)}</span>
                        </span>
                        <span className="text-slate-500">
                          Tiền đơn {formatCurrency(o.amount)} · Đã trả {formatCurrency(o.paid)} ·{' '}
                          <strong className="text-amber-700">Còn {formatCurrency(o.remaining)}</strong>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Lịch sử thanh toán
              </h3>
              <PaymentHistory customerId={debt.customerId} payments={debt.payments} />
            </section>
          </div>
        )}
      </Modal>

      {customer && (
        <PaymentFormModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          customerId={customer.id}
          customerName={customer.companyName}
          suggestedAmount={Math.max(0, currentDebt)}
        />
      )}
    </>
  );
};
