/**
 * vietqr.ts — Build URL VietQR để hiển thị mã QR chuyển khoản
 *
 * VietQR là tiêu chuẩn QR thanh toán liên ngân hàng Việt Nam.
 * Build URL hình ảnh QR qua API công khai của img.vietqr.io — không cần API key.
 *
 * Docs: https://www.vietqr.io/danh-sach-api/tao-qr-code-tu-tham-so/
 */

type VietQRParams = {
  /** Mã ngân hàng — BIN hoặc tên viết tắt (VD: "970422" = MB Bank, "VCB" = Vietcombank) */
  bankId: string;
  /** Số tài khoản người nhận */
  accountNumber: string;
  /** Tên chủ tài khoản (hiển thị trên QR) */
  accountName?: string;
  /** Số tiền — đơn vị đồng (Int), truyền vào trực tiếp */
  amount: number;
  /** Nội dung chuyển khoản */
  description?: string;
  /** Template QR (compact | compact2 | qr_only | print). Default: "compact" */
  template?: "compact" | "compact2" | "qr_only" | "print";
};

/**
 * Build URL hình ảnh QR VietQR.
 * Trả về URL dạng: https://img.vietqr.io/image/{bankId}-{accountNumber}-{template}.png?...
 *
 * @example
 * buildVietQRUrl({
 *   bankId: "MB",
 *   accountNumber: "0123456789",
 *   accountName: "NGUYEN VAN A",
 *   amount: 150000,
 *   description: "Chia tien nhom Da Lat",
 * })
 * // → "https://img.vietqr.io/image/MB-0123456789-compact.png?amount=150000&addInfo=..."
 */
export function buildVietQRUrl({
  bankId,
  accountNumber,
  accountName,
  amount,
  description = "",
  template = "compact",
}: VietQRParams): string {
  const base = `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png`;

  const params = new URLSearchParams({
    amount: amount.toString(),
    addInfo: description,
    ...(accountName ? { accountName } : {}),
  });

  return `${base}?${params.toString()}`;
}

/**
 * Kiểm tra xem bankId có trong danh sách ngân hàng phổ biến không.
 * Dùng để validate paymentInfo trước khi build QR.
 */
export const POPULAR_BANKS = [
  { id: "MB", name: "MB Bank" },
  { id: "VCB", name: "Vietcombank" },
  { id: "TCB", name: "Techcombank" },
  { id: "ACB", name: "ACB" },
  { id: "VPB", name: "VPBank" },
  { id: "TPB", name: "TPBank" },
  { id: "BIDV", name: "BIDV" },
  { id: "VTB", name: "Vietinbank" },
  { id: "STB", name: "Sacombank" },
  { id: "MSB", name: "MSB" },
] as const;
