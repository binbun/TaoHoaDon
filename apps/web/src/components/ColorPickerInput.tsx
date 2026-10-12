import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Pipette, ChevronDown } from 'lucide-react';

interface ColorPickerInputProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#1B9550', // GROB Green
  '#0D4EA0', // EUPLUS Blue
  '#FF6724', // BLUM Orange
  '#1C4C8F', // EUROKING Deep Blue
  '#247948', // KINGENBLU Green
  '#E11D48', // Red
  '#9333EA', // Purple
  '#0284C7', // Sky Blue
  '#D97706', // Amber
  '#475569', // Slate
  '#0F172A', // Dark Slate
  '#E11D48', // Crimson
];

export const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  color,
  onChange,
  label = 'Màu đại diện',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentColor = color || '#1B9550';

  return (
    <div className="space-y-1.5" ref={popoverRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B9550] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-6 h-6 rounded-lg border border-black/10 shadow-2xs shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <span className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
              {currentColor}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Pipette className="w-3.5 h-3.5" />
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Popover with react-colorful */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 p-3 bg-white rounded-2xl shadow-xl border border-slate-200 space-y-3 w-[240px] animate-in fade-in-50 zoom-in-95 duration-150">
            {/* react-colorful HexColorPicker */}
            <div className="custom-color-picker flex justify-center [&_.react-colorful]:w-full [&_.react-colorful]:h-[150px] [&_.react-colorful]:rounded-xl">
              <HexColorPicker color={currentColor} onChange={onChange} />
            </div>

            {/* Hex Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400">HEX</span>
              <input
                type="text"
                value={currentColor.toUpperCase()}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (!val.startsWith('#')) val = '#' + val;
                  onChange(val);
                }}
                className="w-full text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1B9550]"
                maxLength={7}
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Màu gợi ý
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onChange(preset);
                    }}
                    className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                      currentColor.toUpperCase() === preset.toUpperCase()
                        ? 'ring-2 ring-slate-900 ring-offset-1 scale-105'
                        : 'border-black/10'
                    }`}
                    style={{ backgroundColor: preset }}
                    title={preset}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
