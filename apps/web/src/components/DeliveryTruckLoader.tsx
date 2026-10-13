import React, { useState, useEffect } from 'react';

interface DeliveryTruckLoaderProps {
  message?: string;
  fullscreen?: boolean;
  className?: string;
}

const DEFAULT_MESSAGES = [
  'Đang chuyển hàng & đồng bộ dữ liệu...',
  'Đang nạp phụ kiện tủ bếp thông minh...',
  'Đang chuẩn bị bảng báo giá chuẩn A4...',
  'Sẵn sàng giao đơn hàng tới đại lý!',
];

export const DeliveryTruckLoader: React.FC<DeliveryTruckLoaderProps> = ({
  message,
  fullscreen = true,
  className = '',
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
        setFade(true);
      }, 300);
    }, 1800);

    return () => clearInterval(interval);
  }, [message]);

  const currentText = message || DEFAULT_MESSAGES[messageIndex];

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      {/* Truck Animation Container */}
      <div className="relative w-64 h-40 flex items-center justify-center">
        {/* Speed Wind Streaks */}
        <div className="absolute top-6 left-2 w-8 h-0.5 bg-emerald-200/60 rounded-full animate-wind-1" />
        <div className="absolute top-12 left-0 w-12 h-0.5 bg-emerald-200/50 rounded-full animate-wind-2" />
        <div className="absolute top-20 left-4 w-6 h-0.5 bg-emerald-200/40 rounded-full animate-wind-3" />

        {/* Floating Sparks */}
        <div className="absolute top-8 right-6 text-emerald-400 text-xs animate-pulse">✦</div>
        <div className="absolute bottom-12 left-10 text-emerald-500 text-[10px] animate-ping">✧</div>

        {/* SVG Animated Truck (Sample 3) */}
        <svg
          viewBox="0 0 280 180"
          className="w-56 h-36 filter drop-shadow-md animate-truck-bounce"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Exhaust Smoke Puffs */}
          <g className="smoke-group">
            <circle cx="28" cy="116" r="6" fill="#E2E8F0" className="animate-smoke-1" />
            <circle cx="16" cy="114" r="8" fill="#CBD5E1" className="animate-smoke-2" />
            <circle cx="4" cy="110" r="11" fill="#E2E8F0" opacity="0.6" className="animate-smoke-3" />
          </g>

          {/* Truck Shadow */}
          <ellipse cx="140" cy="148" rx="80" ry="10" fill="#0F172A" opacity="0.12" />

          {/* Exhaust Pipe */}
          <rect x="30" y="118" width="10" height="5" rx="2" fill="#64748B" />

          {/* Truck Bed / Cargo Area */}
          <rect x="42" y="58" width="104" height="66" rx="8" fill="#14733E" />
          <rect x="46" y="62" width="96" height="58" rx="6" fill="#1B9550" />

          {/* Delivery Parcel Box (Carried on back) */}
          <g className="animate-box-jiggle origin-bottom">
            {/* Box Body */}
            <rect x="52" y="24" width="84" height="60" rx="6" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
            <rect x="54" y="26" width="80" height="12" fill="#FBBF24" opacity="0.6" />
            {/* Packaging Tape */}
            <rect x="88" y="24" width="12" height="60" fill="#D97706" opacity="0.85" />
            {/* Box Label / Icons */}
            <rect x="62" y="44" width="30" height="24" rx="3" fill="#B45309" opacity="0.9" />
            {/* Cutlery / Kitchen Icon Symbols */}
            <path d="M68 49v6M72 49v6M76 49v6M72 55v8M68 55a4 4 0 008 0" stroke="#FEF3C7" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M84 49v14M81 53h6" stroke="#FEF3C7" strokeWidth="1.2" strokeLinecap="round" />
            <text x="63" y="74" fill="#FEF3C7" fontSize="5" fontWeight="bold" letterSpacing="0.5">EUPLUS</text>
          </g>

          {/* Cargo Bed White Branding Strip */}
          <rect x="42" y="100" width="104" height="18" fill="#14733E" />
          <text x="56" y="113" fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="2.5">
            DELIVERY
          </text>

          {/* Truck Cabin (Front) */}
          <path
            d="M142 66h32c12 0 24 10 28 22l8 18c2 4 4 9 4 14v10c0 4-4 8-8 8h-64V66z"
            fill="#FFFFFF"
          />
          {/* Cabin Green Lower Section */}
          <path
            d="M142 108h70c4 0 6 3 6 6v6c0 4-4 8-8 8h-68v-20z"
            fill="#1B9550"
          />
          {/* Front Bumper */}
          <rect x="210" y="128" width="12" height="10" rx="3" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />

          {/* Windshield / Window */}
          <path
            d="M148 72h24c8 0 16 6 19 14l6 14h-49V72z"
            fill="#93C5FD"
            stroke="#60A5FA"
            strokeWidth="1.5"
          />
          {/* Window Glass Glare Reflection */}
          <path d="M152 75l14 20h8l-14-20h-8z" fill="#FFFFFF" opacity="0.6" />

          {/* Headlight */}
          <circle cx="216" cy="118" r="6" fill="#FDE047" stroke="#EAB308" strokeWidth="1.5" />
          <path d="M216 114l24-6v20l-24-6" fill="#FEF08A" opacity="0.35" />

          {/* Side Mirror */}
          <rect x="156" y="86" width="6" height="10" rx="2" fill="#14733E" />

          {/* Door Handle */}
          <rect x="154" y="112" width="10" height="3" rx="1.5" fill="#64748B" />

          {/* Front Wheel Arch */}
          <path d="M174 138a18 18 0 0136 0h-36z" fill="#0F172A" />
          {/* Rear Wheel Arch */}
          <path d="M68 138a18 18 0 0136 0h-36z" fill="#0F172A" />

          {/* Rear Wheel (Spinning) */}
          <g className="animate-spin-wheel origin-[86px_138px]">
            <circle cx="86" cy="138" r="16" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="86" cy="138" r="9" fill="#E2E8F0" />
            <circle cx="86" cy="138" r="3" fill="#1B9550" />
            {/* Wheel Spokes for visible rotation */}
            <line x1="86" y1="129" x2="86" y2="147" stroke="#64748B" strokeWidth="2" />
            <line x1="77" y1="138" x2="95" y2="138" stroke="#64748B" strokeWidth="2" />
          </g>

          {/* Front Wheel (Spinning) */}
          <g className="animate-spin-wheel origin-[192px_138px]">
            <circle cx="192" cy="138" r="16" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="192" cy="138" r="9" fill="#E2E8F0" />
            <circle cx="192" cy="138" r="3" fill="#1B9550" />
            {/* Wheel Spokes for visible rotation */}
            <line x1="192" y1="129" x2="192" y2="147" stroke="#64748B" strokeWidth="2" />
            <line x1="183" y1="138" x2="201" y2="138" stroke="#64748B" strokeWidth="2" />
          </g>

          {/* Speed Dust Under Wheels */}
          <ellipse cx="60" cy="151" rx="14" ry="2" fill="#94A3B8" opacity="0.4" />
          <ellipse cx="166" cy="151" rx="14" ry="2" fill="#94A3B8" opacity="0.4" />
        </svg>

        {/* Road Surface with Scrolling Dashes */}
        <div className="absolute bottom-2 left-4 right-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="w-full h-full animate-road-scroll flex gap-2">
            <span className="w-6 h-full bg-slate-400/70 inline-block rounded-full shrink-0" />
            <span className="w-8 h-full bg-[#1B9550] inline-block rounded-full shrink-0" />
            <span className="w-6 h-full bg-slate-400/70 inline-block rounded-full shrink-0" />
            <span className="w-10 h-full bg-slate-400/70 inline-block rounded-full shrink-0" />
            <span className="w-6 h-full bg-[#1B9550] inline-block rounded-full shrink-0" />
            <span className="w-8 h-full bg-slate-400/70 inline-block rounded-full shrink-0" />
          </div>
        </div>
      </div>

      {/* Dynamic Animated Text */}
      <div className="mt-4 flex flex-col items-center">
        <p
          className={`text-sm sm:text-base font-bold text-slate-800 tracking-tight transition-opacity duration-300 ${
            fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          {currentText}
        </p>

        {/* Micro Progress Bar */}
        <div className="w-36 h-1.5 bg-slate-200/90 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-[#14733E] via-[#1B9550] to-emerald-400 rounded-full animate-progress-loop" />
        </div>
      </div>

      {/* Embedded Scoped CSS Animations for 60fps Smoothness */}
      <style>{`
        @keyframes truck-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes box-jiggle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-1.5deg) translateY(-1px); }
          75% { transform: rotate(1deg) translateY(0.5px); }
        }
        @keyframes spin-wheel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes smoke-1 {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0.9; }
          100% { transform: translate(-14px, -6px) scale(1.3); opacity: 0; }
        }
        @keyframes smoke-2 {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-20px, -10px) scale(1.5); opacity: 0; }
        }
        @keyframes smoke-3 {
          0% { transform: translate(0, 0) scale(0.4); opacity: 0.6; }
          100% { transform: translate(-26px, -14px) scale(1.7); opacity: 0; }
        }
        @keyframes road-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40px); }
        }
        @keyframes wind {
          0% { transform: translateX(20px); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateX(-40px); opacity: 0; }
        }
        @keyframes progress-loop {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(20%); }
          100% { transform: translateX(100%); }
        }

        .animate-truck-bounce {
          animation: truck-bounce 0.4s ease-in-out infinite;
        }
        .animate-box-jiggle {
          animation: box-jiggle 0.5s ease-in-out infinite;
        }
        .animate-spin-wheel {
          animation: spin-wheel 0.5s linear infinite;
        }
        .animate-smoke-1 {
          animation: smoke-1 0.7s ease-out infinite;
        }
        .animate-smoke-2 {
          animation: smoke-2 0.7s ease-out 0.2s infinite;
        }
        .animate-smoke-3 {
          animation: smoke-3 0.7s ease-out 0.4s infinite;
        }
        .animate-road-scroll {
          animation: road-scroll 0.35s linear infinite;
        }
        .animate-wind-1 {
          animation: wind 0.6s ease-in infinite;
        }
        .animate-wind-2 {
          animation: wind 0.8s ease-in 0.2s infinite;
        }
        .animate-wind-3 {
          animation: wind 0.5s ease-in 0.3s infinite;
        }
        .animate-progress-loop {
          animation: progress-loop 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50/95 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
};
