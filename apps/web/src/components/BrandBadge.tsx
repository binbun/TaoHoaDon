import React from 'react';

interface BrandBadgeProps {
  brand?: string | null;
  className?: string;
}

export const BRAND_CONFIG: Record<
  string,
  { primary: string; bg: string; border: string; label: string }
> = {
  GROB: {
    primary: '#1B9550',
    bg: '#EBF7F0',
    border: 'rgba(27, 149, 80, 0.3)',
    label: 'GROB',
  },
  KINGENBLU: {
    primary: '#247948',
    bg: '#ECF6F0',
    border: 'rgba(36, 121, 72, 0.3)',
    label: 'KINGENBLU',
  },
  EUPLUS: {
    primary: '#0D4EA0',
    bg: '#EAF1FA',
    border: 'rgba(13, 78, 160, 0.3)',
    label: 'EUPLUS',
  },
};

export const getBrandStyle = (brandName?: string | null) => {
  const normalized = (brandName || 'GROB').trim().toUpperCase();
  if (normalized.includes('GROB') || normalized.includes('GRÖB')) {
    return BRAND_CONFIG.GROB;
  }
  if (normalized.includes('KINGENBLU')) {
    return BRAND_CONFIG.KINGENBLU;
  }
  if (normalized.includes('EUPLUS')) {
    return BRAND_CONFIG.EUPLUS;
  }
  return {
    primary: '#475569',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    label: brandName || 'Khác',
  };
};

export const BrandBadge: React.FC<BrandBadgeProps> = ({ brand, className = '' }) => {
  const brandName = brand || 'GROB';
  const style = getBrandStyle(brandName);

  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase transition-colors ${className}`}
      style={{
        color: style.primary,
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      {brandName}
    </span>
  );
};
