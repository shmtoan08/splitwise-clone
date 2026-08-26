/**
 * exchangeRate.ts — Tra cứu tỷ giá qua Frankfurter API với in-memory cache theo ngày
 *
 * Cache key: "<from>-<to>-YYYY-MM-DD"
 * Chỉ gọi API khi chưa có cache cho cặp tiền tệ + ngày hôm nay.
 * Tỷ giá được trả về dạng number (JavaScript) — caller tự convert sang Decimal khi cần lưu DB.
 */

const rateCache = new Map<string, number>();

function getTodayKey(from: string, to: string): string {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return `${from.toUpperCase()}-${to.toUpperCase()}-${today}`;
}

/**
 * Lấy tỷ giá từ `from` sang `to`.
 * Ví dụ: getExchangeRate("USD", "VND") → 24500
 *
 * @throws {ExchangeRateError} nếu API lỗi hoặc timeout
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  // Cùng loại tiền tệ — tỷ giá luôn là 1
  if (fromUpper === toUpper) return 1;

  const cacheKey = getTodayKey(fromUpper, toUpper);
  const cached = rateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Gọi Frankfurter API với timeout 5 giây
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.frankfurter.app/latest?from=${fromUpper}&to=${toUpper}`;
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });

    if (!res.ok) {
      throw new ExchangeRateError(
        `Frankfurter API trả về ${res.status}: ${res.statusText}`
      );
    }

    const json = await res.json();
    const rate: number | undefined = json?.rates?.[toUpper];

    if (rate === undefined || typeof rate !== "number" || rate <= 0) {
      throw new ExchangeRateError(
        `Không lấy được tỷ giá ${fromUpper}→${toUpper} từ API`
      );
    }

    // Lưu cache
    rateCache.set(cacheKey, rate);
    return rate;
  } catch (err: unknown) {
    if (err instanceof ExchangeRateError) throw err;
    // Timeout hoặc network error
    throw new ExchangeRateError(
      `Không kết nối được tới API tỷ giá. Vui lòng nhập tỷ giá thủ công.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Lỗi cụ thể cho vấn đề tỷ giá — phân biệt với lỗi hệ thống thông thường */
export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeRateError";
  }
}
