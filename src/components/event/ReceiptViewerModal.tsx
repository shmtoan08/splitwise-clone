"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, RotateCw, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
};

export default function ReceiptViewerModal({ isOpen, onClose, imageUrl, title }: Props) {
  const [rotation, setRotation] = useState(0);

  // Reset góc xoay mỗi khi mở modal hoặc thay đổi ảnh
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
    }
  }, [isOpen, imageUrl]);

  if (!imageUrl) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Lọc bỏ ký tự đặc biệt khỏi tên file
      const safeTitle = title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
      link.download = `receipt_${safeTitle}_${Date.now()}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image", error);
      // Fallback: Mở tab mới nếu bị CORS chặn
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-black/95 p-0 border-none rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] sm:h-[85vh] [&>button]:hidden">
        <div className="sr-only">
          <DialogTitle>View Receipt: {title}</DialogTitle>
          <DialogDescription>A full view of the receipt image</DialogDescription>
        </div>

        {/* Header - Gradient Đen trong suốt */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h3 className="text-white font-semibold truncate text-sm sm:text-base mr-12 drop-shadow-md">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Image Viewer */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={getOptimizedImageUrl(imageUrl)}
              alt={title}
              style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s ease" }}
              className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Floating Toolbar Nổi */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-full shadow-2xl z-50">
          <button
            onClick={handleRotate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white font-medium text-sm transition-all"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Xoay 90°</span>
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Tải xuống</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}