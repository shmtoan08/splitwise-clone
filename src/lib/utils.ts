import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Currency formatting — mọi amount là Int (đơn vị đồng), KHÔNG dùng Float
// ---------------------------------------------------------------------------

type FormatCurrencyOptions = {
  /** ISO 4217 currency code. Default: "VND" */
  currency?: string;
  /** Locale string. Default: "vi-VN" */
  locale?: string;
  /** Hiển thị compact format (1.000.000 → 1tr). Default: false */
  compact?: boolean;
};

/**
 * Format số tiền (Int, đơn vị đồng) sang chuỗi hiển thị có ký hiệu tiền tệ.
 *
 * @example
 * formatCurrency(150000)                                    // "150.000 ₫"
 * formatCurrency(150000, { currency: "JPY", locale: "ja-JP" })  // "¥150,000"
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const { currency = "VND", locale = "vi-VN", compact = false } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

/**
 * Format số nguyên với dấu phân cách hàng nghìn (không ký hiệu tiền).
 * @example formatNumber(1500000) // "1.500.000"
 */
export function formatNumber(amount: number, locale = "vi-VN"): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse chuỗi số (có thể có dấu phân cách) sang Int.
 * @example parseAmount("1.500.000") // 1500000
 */
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10);
}
