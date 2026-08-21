/**
 * currency.ts — Tiện ích đa tiền tệ (Phase 2)
 *
 * Phase 1: Chỉ hỗ trợ VND và JPY, không có multi-currency
 * Phase 2: Mỗi Expense có thể có currency riêng, quy đổi về currency chung của Event
 *
 * QUAN TRỌNG: Tỷ giá phải lưu SNAPSHOT tại thời điểm tạo Expense
 * (field exchangeRate, originalAmount, originalCurrency trên Expense)
 * KHÔNG tính lại theo tỷ giá real-time sau này.
 *
 * TODO (Phase 2): Implement convertToBaseCurrency, formatMultiCurrency
 */

export type SupportedCurrency = "VND" | "JPY";

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { symbol: string; locale: string; decimalPlaces: 0 }
> = {
  VND: { symbol: "₫", locale: "vi-VN", decimalPlaces: 0 },
  JPY: { symbol: "¥", locale: "ja-JP", decimalPlaces: 0 },
};

/**
 * Phase 2 placeholder — Quy đổi amount từ currency nguồn sang currency đích.
 * exchangeRate phải là snapshot lưu từ lúc tạo Expense, không real-time.
 *
 * @param amount - Số tiền nguồn (Int, đơn vị nhỏ nhất của fromCurrency)
 * @param exchangeRate - Tỷ giá tại thời điểm tạo (snapshot, lưu trong DB)
 * @returns Số tiền quy đổi (Int, làm tròn xuống)
 */
export function convertToBaseCurrency(
  amount: number,
  exchangeRate: number
): number {
  // TODO (Phase 2): implement
  return Math.floor(amount * exchangeRate);
}
