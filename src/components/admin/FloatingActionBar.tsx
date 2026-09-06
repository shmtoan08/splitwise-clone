"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface FloatingActionBarProps {
  selectedCount: number;
  label: string;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}

export function FloatingActionBar({
  selectedCount,
  label,
  clearLabel,
  onClear,
  children,
}: FloatingActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 max-w-2xl mx-auto rounded-full bg-slate-900/95 backdrop-blur-md text-white shadow-2xl px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3 border border-slate-700/60 animate-in slide-in-from-bottom-5 fade-in duration-200">
      {/* Bên trái: Số lượng đã chọn & Nút bỏ chọn */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
          {label}
        </span>
        <button
          type="button"
          onClick={onClear}
          title={clearLabel}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Bên phải: Cụm nút thao tác */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {children}
      </div>
    </div>
  );
}
