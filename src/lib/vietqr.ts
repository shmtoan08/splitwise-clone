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
/**
 * Chuyển chuỗi tiếng Việt có dấu thành không dấu và loại bỏ ký tự đặc biệt
 */
export function normalizeVietnameseString(str: string): string {
  if (!str) return "";
  let result = str;
  // Bỏ dấu
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  result = result.replace(/[đĐ]/g, "d");
  // Chỉ giữ lại chữ cái, số và khoảng trắng
  result = result.replace(/[^a-zA-Z0-9 ]/g, "");
  // Xoá khoảng trắng thừa
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

/**
 * Rút gọn message chuyển khoản để không vượt quá giới hạn của ngân hàng (thường 50 ký tự)
 */
export function buildTransferMessage(payerName: string, eventTitle: string): string {
  const normalizedPayer = normalizeVietnameseString(payerName);
  const normalizedEvent = normalizeVietnameseString(eventTitle);
  
  // Format cơ bản: "{TenNguoiNo} tra tien {TenSuKien}"
  let message = `${normalizedPayer} tra tien ${normalizedEvent}`;
  
  if (message.length > 50) {
    // Nếu quá dài, rút gọn tên event trước
    const maxEventLength = 50 - normalizedPayer.length - 10; // " tra tien " = 10 chars
    if (maxEventLength > 5) {
       message = `${normalizedPayer} tra tien ${normalizedEvent.substring(0, maxEventLength)}`;
    } else {
       // Cực đoan: cắt cả hai
       message = `${normalizedPayer.substring(0, 20)} tra tien ${normalizedEvent.substring(0, 20)}`;
    }
  }
  return message;
}

export function buildVietQRUrl({
  bankId,
  accountNumber,
  accountName,
  amount,
  description = "",
  template = "compact",
}: VietQRParams): string {
  const base = `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png`;

  const safeAddInfo = normalizeVietnameseString(description);
  const params = new URLSearchParams({
    amount: amount.toString(),
    addInfo: safeAddInfo,
  });

  if (accountName) {
    const safeName = normalizeVietnameseString(accountName).toUpperCase();
    params.set("accountName", safeName);
  }

  return `${base}?${params.toString()}`;
}

/**
 * Danh sách ngân hàng phổ biến với mã BIN chính xác theo chuẩn VietQR.io
 * Nguồn: https://api.vietqr.io/v2/banks (đã đối chiếu thủ công, cập nhật 2026-08)
 * BIN là mã ngân hàng dùng trong URL ảnh QR: img.vietqr.io/image/{BIN}-{STK}-compact.png
 *
 * Lưu ý: chỉ bao gồm các NH có transferSupported=1 theo API.
 * BIN đã bỏ qua: MoMo (971025), ViettelMoney (971005), VNPT Money (971011) —
 * là ví điện tử, nằm ngoài phạm vi MVP chuyển khoản ngân hàng trực tiếp.
 */
export const POPULAR_BANKS = [
  { bin: "970422", shortName: "MB",          name: "MB Bank" },
  { bin: "970436", shortName: "VCB",         name: "Vietcombank" },
  { bin: "970407", shortName: "TCB",         name: "Techcombank" },
  { bin: "970416", shortName: "ACB",         name: "ACB" },
  { bin: "970432", shortName: "VPB",         name: "VPBank" },
  { bin: "970423", shortName: "TPB",         name: "TPBank" },
  { bin: "970418", shortName: "BIDV",        name: "BIDV" },
  { bin: "970415", shortName: "VTB",         name: "Vietinbank" },
  { bin: "970403", shortName: "STB",         name: "Sacombank" },
  { bin: "970426", shortName: "MSB",         name: "MSB" },
  { bin: "970405", shortName: "AGR",         name: "Agribank" },
  { bin: "970431", shortName: "EIB",         name: "Eximbank" },
  { bin: "970437", shortName: "HDB",         name: "HDBank" },
  { bin: "970441", shortName: "VIB",         name: "VIB" },
  { bin: "970409", shortName: "BAB",         name: "BacABank" },
  { bin: "546034", shortName: "CAKE",        name: "CAKE by VPBank" },
  { bin: "970438", shortName: "BVB",         name: "BaoVietBank" },
  { bin: "970419", shortName: "NCB",         name: "NCB" },
  { bin: "970452", shortName: "KLB",         name: "KienLongBank" },
] as const;

export type PopularBank = typeof POPULAR_BANKS[number];

