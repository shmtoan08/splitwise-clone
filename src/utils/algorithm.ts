/**
 * algorithm.ts — Thuật toán nghiệp vụ cốt lõi của ứng dụng chia tiền
 *
 * File này chứa logic thuần (không dính React, không dính Prisma).
 * Có thể import ở cả Server Action lẫn unit test.
 *
 * Nguyên tắc bắt buộc:
 * - Mọi amount đều là Int (đơn vị đồng, không có thập phân)
 * - Tổng các splits phải luôn khớp chính xác với totalAmount
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SplitResult = {
  participantId: string;
  /** Số tiền participant phải chịu — đơn vị đồng (Int) */
  amount: number;
};

export type Balance = {
  id: string;
  /** Dương (+): người này đang được nợ. Âm (-): người này đang nợ. */
  balance: number;
};

export type DebtTransaction = {
  /** Participant ID của người trả (con nợ) */
  from: string;
  /** Participant ID của người nhận (chủ nợ) */
  to: string;
  /** Số tiền cần chuyển — luôn dương */
  amount: number;
};

// ---------------------------------------------------------------------------
// splitEvenly — Chia đều có xử lý phần dư
// ---------------------------------------------------------------------------

/**
 * Chia `totalAmount` đều cho `participantIds`, xử lý phần dư (remainder)
 * bằng cách phân bổ thêm 1 đồng vào các participant đầu tiên trong danh sách.
 *
 * Đảm bảo: sum(result[i].amount) === totalAmount (luôn đúng, không có sai số)
 *
 * @example
 * splitEvenly(100000, ["A", "B", "C"])
 * // → [{ participantId: "A", amount: 33334 },
 * //    { participantId: "B", amount: 33333 },
 * //    { participantId: "C", amount: 33333 }]
 *
 * @example
 * splitEvenly(200000, ["A", "B"])
 * // → [{ participantId: "A", amount: 100000 },
 * //    { participantId: "B", amount: 100000 }]
 */
export function splitEvenly(
  totalAmount: number,
  participantIds: string[]
): SplitResult[] {
  // Spec: trả về [] thay vì throw khi input rỗng hoặc không hợp lệ
  if (participantIds.length === 0 || totalAmount <= 0) {
    return [];
  }

  const n = participantIds.length;
  const base = Math.floor(totalAmount / n);
  // Số người nhận thêm 1 đồng phần dư
  const remainder = totalAmount - base * n;

  const result = participantIds.map((id, index) => ({
    participantId: id,
    // index < remainder: người đầu nhận thêm 1 đồng lẻ
    amount: index < remainder ? base + 1 : base,
  }));

  validateSplitSum(totalAmount, result);

  return result;
}

// ---------------------------------------------------------------------------
// splitByShares — Chia theo tỷ lệ (shares) có xử lý phần dư
// ---------------------------------------------------------------------------

export type ShareInput = {
  participantId: string;
  /** Số phần (shares) participant này nhận. Có thể là số thập phân dương (VD: 1.5, 2.0). */
  shares: number;
};

/**
 * Chia `totalAmount` theo tỷ lệ shares, xử lý phần dư tương tự splitEvenly.
 *
 * @example
 * splitByShares(300000, [
 *   { participantId: "A", shares: 2 },
 *   { participantId: "B", shares: 1 },
 * ])
 * // → A: 200000, B: 100000
 *
 * @example
 * splitByShares(100000, [
 *   { participantId: "A", shares: 2 },
 *   { participantId: "B", shares: 1 },
 * ])
 * // → A: 66667, B: 33333
 */
export function splitByShares(
  totalAmount: number,
  participants: ShareInput[]
): SplitResult[] {
  const totalShares = participants.reduce((sum, p) => sum + p.shares, 0);
  // Spec: trả về array map amount=0 thay vì [] nếu rỗng hoặc totalShares <= 0 để giữ đúng length của input
  if (participants.length === 0 || totalShares <= 0) {
    return participants.map((p) => ({ participantId: p.participantId, amount: 0 }));
  }

  const raw = participants.map((i) => {
    const exact = (totalAmount * i.shares) / totalShares;
    const floor = Math.floor(exact);
    return { participantId: i.participantId, floor, remainder: exact - floor };
  });

  const allocated = raw.reduce((s, r) => s + r.floor, 0);
  const leftover = totalAmount - allocated;

  const ranked = [...raw].sort(
    (a, b) => b.remainder - a.remainder || a.participantId.localeCompare(b.participantId)
  );
  const bonusIds = new Set(ranked.slice(0, leftover).map((r) => r.participantId));

  const result = raw.map((r) => ({
    participantId: r.participantId,
    amount: r.floor + (bonusIds.has(r.participantId) ? 1 : 0),
  }));

  validateSplitSum(totalAmount, result);

  return result;
}

// ---------------------------------------------------------------------------
// splitByCustomAmount — Chia theo số tiền tùy chỉnh (custom amount)
// ---------------------------------------------------------------------------

export type CustomAmountInput = {
  participantId: string;
  /** Số tiền được assign trực tiếp — đơn vị đồng */
  amount: number;
};

/**
 * Validate và trả về splits từ custom amounts.
 * Throw nếu tổng không khớp với totalAmount.
 *
 * Server Action phải gọi hàm này trước khi lưu DB.
 */
export function splitByCustomAmount(
  totalAmount: number,
  customAmounts: CustomAmountInput[]
): SplitResult[] {
  const sum = customAmounts.reduce((acc, p) => acc + p.amount, 0);
  if (sum !== totalAmount) {
    throw new Error(
      `splitByCustomAmount: tổng custom amounts (${sum}) không khớp totalAmount (${totalAmount})`
    );
  }
  return customAmounts.map(({ participantId, amount }) => ({
    participantId,
    amount,
  }));
}

// ---------------------------------------------------------------------------
// calculateBalances — Tính số dư của từng participant
// ---------------------------------------------------------------------------

export type ExpenseData = {
  payerId: string;
  splits: Array<{ participantId: string; amount: number }>;
};

/**
 * Tính balance (số dư) của từng participant dựa trên danh sách expenses.
 *
 * Balance = Tổng đã trả (payer) - Tổng phải chịu (splits)
 * - Dương (+): người này được hoàn tiền
 * - Âm (-): người này còn nợ
 *
 * @param participantIds - Danh sách tất cả participant trong event
 * @param expenses - Danh sách expense với splits
 */
export function calculateBalances(
  participantIds: string[],
  expenses: ExpenseData[]
): Balance[] {
  // Khởi tạo balance = 0 cho tất cả
  const balanceMap = new Map<string, number>(
    participantIds.map((id) => [id, 0])
  );

  for (const expense of expenses) {
    // Người trả: +toàn bộ amount (tổng expense, không phải split của họ)
    // Amount của expense = tổng splits
    const totalAmount = expense.splits.reduce((sum, s) => sum + s.amount, 0);
    const payerBalance = balanceMap.get(expense.payerId) ?? 0;
    balanceMap.set(expense.payerId, payerBalance + totalAmount);

    // Mỗi người trong splits: -amount họ phải chịu
    for (const split of expense.splits) {
      const current = balanceMap.get(split.participantId) ?? 0;
      balanceMap.set(split.participantId, current - split.amount);
    }
  }

  const result = participantIds.map((id) => ({
    id,
    balance: balanceMap.get(id) ?? 0,
  }));

  // Assertion: Tổng tất cả balance luôn phải bằng 0 (vì tiền không tự sinh ra hay mất đi)
  const totalBalance = result.reduce((sum, b) => sum + b.balance, 0);
  if (totalBalance !== 0) {
    throw new Error(`Lỗi hệ thống: Tổng balance không bằng 0 (lệch ${totalBalance}đ). Dữ liệu bị sai lệch.`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// simplifyDebts — Thuật toán tham lam tối thiểu hoá số giao dịch
// ---------------------------------------------------------------------------

/**
 * Tính danh sách giao dịch tối thiểu để mọi người hoà vốn (tất cả balance về 0).
 *
 * Thuật toán tham lam (greedy):
 * 1. Tách thành 2 nhóm: debtors (balance âm) và creditors (balance dương)
 * 2. Sort debtors tăng dần (âm nhiều nhất trước), creditors giảm dần (dương nhiều nhất trước)
 * 3. Ghép người nợ nhiều nhất với người được nợ nhiều nhất
 * 4. Lặp cho đến khi mọi người về 0
 *
 * Kết quả: tối đa n-1 giao dịch cho n người (tối ưu trong trường hợp tổng quát)
 *
 * @example
 * simplifyDebts([
 *   { id: "A", balance: 100000 },  // A được nợ 100k
 *   { id: "B", balance: -60000 },  // B nợ 60k
 *   { id: "C", balance: -40000 },  // C nợ 40k
 * ])
 * // → [
 * //   { from: "B", to: "A", amount: 60000 },
 * //   { from: "C", to: "A", amount: 40000 },
 * // ]
 */
export function simplifyDebts(balances: Balance[]): DebtTransaction[] {
  // Deep copy để không mutate input
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance); // Âm nhiều nhất trước

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance); // Dương nhiều nhất trước

  const transactions: DebtTransaction[] = [];
  let i = 0; // con trỏ debtors
  let j = 0; // con trỏ creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Số tiền của giao dịch này = min(nợ của debtor, công của creditor)
    const amount = Math.min(-debtor.balance, creditor.balance);

    transactions.push({
      from: debtor.id,
      to: creditor.id,
      amount,
    });

    // Cập nhật balance sau giao dịch
    debtor.balance += amount; // âm → bớt nợ đi
    creditor.balance -= amount; // dương → bớt được nợ đi

    // Nếu debtor đã hoà → chuyển sang debtor tiếp theo
    if (debtor.balance === 0) i++;
    // Nếu creditor đã hoà → chuyển sang creditor tiếp theo
    if (creditor.balance === 0) j++;
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// Validation helper — dùng trong Server Actions
// ---------------------------------------------------------------------------

/**
 * Validate tổng splits có khớp với totalAmount không.
 * Ném lỗi nếu không khớp — phải gọi trước khi lưu vào DB.
 */
export function validateSplitSum(
  totalAmount: number,
  splits: Array<{ amount: number }>
): void {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  if (sum !== totalAmount) {
    throw new Error(
      `Tổng các phần chia (${sum}đ) không khớp với số tiền khoản chi (${totalAmount}đ).`
    );
  }
}
