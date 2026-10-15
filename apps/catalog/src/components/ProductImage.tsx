import {
  Archive,
  ArrowUpFromLine,
  CookingPot,
  LayoutGrid,
  LucideIcon,
  RotateCw,
  Rows3,
  Settings2,
  Soup,
  Trash2,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react';
import clsx from 'clsx';
import type { PublicProduct } from '@/api';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Giá bát đĩa xoong nồi': CookingPot,
  'Giá bát đĩa cố định tủ trên': Soup,
  'Giá bát đĩa nâng hạ': ArrowUpFromLine,
  'Giá dao thớt, gia vị': UtensilsCrossed,
  'Mâm xoay góc tủ': RotateCw,
  'Tủ kho phụ kiện': Archive,
  'Thùng rác thông minh': Trash2,
  'Thùng gạo thông minh': Wheat,
  'Kệ góc liên hoàn': LayoutGrid,
  'Tay nâng tủ trên': ArrowUpFromLine,
  'Bản lề': Settings2,
  'Ray & hộp kéo': Rows3,
};

const BACKGROUNDS = ['bg-surface', 'bg-cream', 'bg-[#e9eef3]', 'bg-[#f5f5f5]'];

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? LayoutGrid;
}

// Placeholder artwork until real product photos are available.
export function ProductImage({
  product,
  variant = 0,
  showCode = true,
  className,
}: {
  product: Pick<PublicProduct, 'category' | 'brand' | 'code'>;
  variant?: number;
  showCode?: boolean;
  className?: string;
}) {
  const Icon = categoryIcon(product.category);
  return (
    <div
      className={clsx(
        'relative flex aspect-square items-center justify-center overflow-hidden',
        BACKGROUNDS[variant % BACKGROUNDS.length],
        className
      )}
    >
      <div className="absolute inset-[18%] rounded-full bg-white/60" />
      <Icon
        strokeWidth={1}
        className={clsx('relative h-[38%] w-[38%] text-ink-soft', variant % 2 === 1 && 'rotate-6 scale-110')}
      />
      {showCode && (
        <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {product.code}
        </span>
      )}
    </div>
  );
}
