import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bot, CheckCircle2, ExternalLink, Loader2, SendHorizontal, Sparkles, Trash2, X } from 'lucide-react';
import { formatCurrency, QuotationSummary } from '@taohoadon/shared';
import { apiClient } from '../api/client';
import { useCreateQuotation } from '../hooks/useQuotations';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface DraftPreviewItem {
  code: string | null;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
}

interface QuotationDraft {
  draftId: string;
  customer: { id: string; companyName: string };
  payload: Record<string, unknown>;
  preview: { items: DraftPreviewItem[]; summary: QuotationSummary };
  warnings: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  drafts?: QuotationDraft[];
  isError?: boolean;
}

interface AssistantReply {
  reply: string;
  drafts: QuotationDraft[];
  toolsUsed: string[];
}

const SUGGESTIONS = [
  'Doanh số tháng này bao nhiêu?',
  'Tìm tủ bếp GROB 90',
  'Đơn hàng mới nhất của tôi là gì?',
  'Tạo đơn cho khách … gồm 2 …',
];

/** Very small formatter: **bold**, "- " bullets and line breaks. No HTML injection. */
function RichText({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    );
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-slate-400">•</span>
              <span>{inline(bullet[1])}</span>
            </div>
          );
        }
        return line.trim() ? <p key={i}>{inline(line)}</p> : <div key={i} className="h-1" />;
      })}
    </div>
  );
}

function DraftCard({ draft }: { draft: QuotationDraft }) {
  const navigate = useNavigate();
  const createQuotation = useCreateQuotation();
  const [created, setCreated] = useState<{ id: string; quotationNumber: string } | null>(null);
  const { summary } = draft.preview;

  const handleCreate = async () => {
    try {
      const quotation = await createQuotation.mutateAsync(draft.payload);
      setCreated({ id: quotation.id, quotationNumber: quotation.quotationNumber });
    } catch {
      // the hook already shows an error toast
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-white overflow-hidden text-xs">
      <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
        <div className="font-semibold text-emerald-800">Bản nháp đơn hàng</div>
        <div className="text-slate-600 truncate">{draft.customer.companyName}</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {draft.preview.items.map((item, i) => (
          <li key={i} className="px-3 py-1.5 flex justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate">{item.name}</div>
              <div className="text-slate-500">
                {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                {item.discount > 0 && ` · CK ${item.discount}%`}
                {item.vatRate > 0 && ` · VAT ${item.vatRate}%`}
              </div>
            </div>
            <div className="font-medium text-slate-800 whitespace-nowrap">{formatCurrency(item.total)}</div>
          </li>
        ))}
      </ul>

      <dl className="px-3 py-2 border-t border-slate-100 space-y-0.5">
        <div className="flex justify-between text-slate-600"><dt>Tiền hàng</dt><dd>{formatCurrency(summary.goodsTotal)}</dd></div>
        {!!summary.orderDiscount && (
          <div className="flex justify-between text-slate-600"><dt>Giảm giá</dt><dd>-{formatCurrency(summary.orderDiscount)}</dd></div>
        )}
        {!!summary.previousDebt && (
          <div className="flex justify-between text-slate-600"><dt>Dư nợ cũ</dt><dd>{formatCurrency(summary.previousDebt)}</dd></div>
        )}
        <div className="flex justify-between font-semibold text-slate-900 text-sm pt-0.5"><dt>Tổng cộng</dt><dd>{formatCurrency(summary.grandTotal)}</dd></div>
      </dl>

      {draft.warnings.length > 0 && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 text-amber-800 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>{draft.warnings.map((w, i) => <div key={i}>{w}</div>)}</div>
        </div>
      )}

      <div className="px-3 pb-3">
        {created ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Đã tạo {created.quotationNumber}
            </span>
            <Button size="sm" variant="outline" rightIcon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => navigate(`/quotations/${created.id}/edit`)}>
              Mở đơn
            </Button>
          </div>
        ) : (
          <Button size="sm" className="w-full" isLoading={createQuotation.isPending} onClick={handleCreate}>
            Tạo đơn nháp
          </Button>
        )}
      </div>
    </div>
  );
}

export const AssistantChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: status } = useQuery<{ enabled: boolean }>({
    queryKey: ['assistant-status'],
    queryFn: () => apiClient('/assistant/status'),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!status?.enabled) return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const history = next.filter((m) => !m.isError).map(({ role, content }) => ({ role, content }));
      const result = await apiClient<AssistantReply>('/assistant/chat', { method: 'POST', data: { messages: history } });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply, drafts: result.drafts }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.message || 'Không thể kết nối trợ lý AI.', isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-40 right-4 bottom-20 lg:bottom-6 lg:right-6 w-12 h-12 rounded-full bg-[#1B9550] hover:bg-[#14733E] text-white shadow-lg shadow-emerald-900/20 flex items-center justify-center transition-transform active:scale-95"
          aria-label="Mở trợ lý AI"
          title="Trợ lý AI"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {open && (
        <section
          className="fixed z-40 inset-x-2 top-16 bottom-20 sm:inset-auto sm:right-4 sm:bottom-20 lg:bottom-6 lg:right-6 sm:w-[400px] sm:h-[620px] sm:max-h-[calc(100vh-7rem)] bg-white rounded-2xl border border-slate-200 shadow-sheet flex flex-col overflow-hidden"
          aria-label="Trợ lý AI"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#1B9550] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Trợ lý AI</div>
                <div className="text-[11px] text-slate-500">Tra cứu dữ liệu & soạn đơn nháp</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button type="button" onClick={() => setMessages([])} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Xóa cuộc trò chuyện" aria-label="Xóa cuộc trò chuyện">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/60">
            {messages.length === 0 && (
              <div className="text-sm text-slate-600 px-1">
                <p className="mb-3">Xin chào! Tôi có thể tra cứu sản phẩm, khách hàng, công nợ, đơn hàng và soạn đơn nháp giúp bạn.</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => (s.includes('…') ? (setInput(s), inputRef.current?.focus()) : send(s))}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-slate-200 bg-white hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user' && 'bg-[#1B9550] text-white rounded-br-md whitespace-pre-wrap',
                    m.role === 'assistant' && !m.isError && 'bg-white border border-slate-200 text-slate-800 rounded-bl-md',
                    m.isError && 'bg-rose-50 border border-rose-200 text-rose-700 rounded-bl-md'
                  )}
                >
                  {m.role === 'user' ? m.content : <RichText text={m.content} />}
                  {m.drafts?.map((d) => <DraftCard key={d.draftId} draft={d} />)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xử lý…
              </div>
            )}
          </div>

          <form
            className="border-t border-slate-100 p-2.5 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Hỏi hoặc yêu cầu tạo đơn…"
              className="flex-1 resize-none max-h-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B9550]/30 focus:border-[#1B9550]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 shrink-0 rounded-xl bg-[#1B9550] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#14733E]"
              aria-label="Gửi"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-[10px] text-slate-400 text-center">AI có thể sai. Luôn kiểm tra đơn trước khi tạo.</p>
        </section>
      )}
    </>
  );
};
