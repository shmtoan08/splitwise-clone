"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export type FilterSortOption = {
  id: string;
  label: string;
};

type FilterSortModalProps = {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title?: string;
  
  // Cấu hình Sắp xếp
  sortTitle?: string;
  sortOptions: FilterSortOption[];
  currentSort: string;
  onSortChange: (id: string) => void;

  // Cấu hình Lọc (Nếu truyền undefined, phần Lọc sẽ tự động ẩn)
  filterTitle?: string;
  filterOptions?: FilterSortOption[];
  currentFilter?: string;
  onFilterChange?: (id: string) => void;
  closeLabel?: string;
};

export default function FilterSortModal({
  isOpen,
  onClose,
  title = "Sắp xếp & Bộ lọc",
  sortTitle = "Sắp xếp theo",
  sortOptions,
  currentSort,
  onSortChange,
  filterTitle = "Lọc dữ liệu",
  filterOptions,
  currentFilter,
  onFilterChange,
  closeLabel,
}: FilterSortModalProps) {
  const t = useTranslations("common");
  
  const renderOptionButton = (
    opt: FilterSortOption, 
    isActive: boolean, 
    onClick: () => void,
    isFullWidth = false
  ) => (
    <button
      key={opt.id}
      onClick={onClick}
      className={`p-2.5 sm:p-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all active:scale-95 ${
        isFullWidth ? "w-full text-left flex items-center justify-between px-3.5" : "text-center"
      } ${
        isActive
          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-600/20"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span>{opt.label}</span>
      {isFullWidth && isActive && (
        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-sm"></span>
      )}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs sm:max-w-md w-[95vw] rounded-3xl p-5 sm:p-6 bg-white gap-6">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 mt-1">
          {/* KHỐI SẮP XẾP */}
          <div className={filterOptions ? "space-y-3" : "space-y-2"}>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sortTitle}</h4>
            
            <div className={filterOptions ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2.5"}>
              {sortOptions.map((opt) => 
                renderOptionButton(opt, currentSort === opt.id, () => onSortChange(opt.id), !filterOptions)
              )}
            </div>
          </div>
          
          {/* KHỐI LỌC */}
          {filterOptions && onFilterChange && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{filterTitle}</h4>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((opt) => 
                  renderOptionButton(opt, currentFilter === opt.id, () => onFilterChange(opt.id))
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-2 sm:space-x-0">
          <Button 
            className="w-full h-12 rounded-full font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-base shadow-none active:scale-95 transition-all border-0"
            onClick={() => onClose(false)}
          >
            {closeLabel || t("close", { fallback: "Đóng" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}