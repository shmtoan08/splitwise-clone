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
  if (participantIds.length === 0) {
    throw new Error("splitEvenly: participantIds không được rỗng");
  }
  if (totalAmount < 0) {
    throw new Error("splitEvenly: totalAmount không được âm");
  }

  const n = participantIds.length;
  const base = Math.floor(totalAmount / n);
  // Số người nhận thêm 1 đồng phần dư
  const remainder = totalAmount - base * n;

  return participantIds.map((id, index) => ({
    participantId: id,
    // index < remainder: người đầu nhận thêm 1 đồng lẻ
    amount: index < remainder ? base + 1 : base,
  }));
}

// ---------------------------------------------------------------------------
// splitByShares — Chia theo tỷ lệ (shares) có xử lý phần dư
// ---------------------------------------------------------------------------

export type ShareInput = {
  participantId: string;
  /** Số phần (shares) participant này nhận. Phải là số nguyên dương. */
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
  if (participants.length === 0) {
    throw new Error("splitByShares: participants không được rỗng");
  }
  if (totalAmount < 0) {
    throw new Error("splitByShares: totalAmount không được âm");
  }

  const totalShares = participants.reduce((sum, p) => sum + p.shares, 0);
  if (totalShares <= 0) {
    throw new Error("splitByShares: tổng shares phải lớn hơn 0");
  }

  // Tính amount cơ bản cho mỗi người theo shares
  const baseAmounts = participants.map((p) => ({
    participantId: p.participantId,
    // Phần nguyên: floor để tránh ghi tiểu số
    amount: Math.floor((totalAmount * p.shares) / totalShares),
    // Lưu phần thập phân để sắp xếp ai nhận phần dư
    fractional: (totalAmount * p.shares) / totalShares % 1,
  }));

  const baseSum = baseAmounts.reduce((sum, p) => sum + p.amount, 0);
  let remainder = totalAmount - baseSum;

  // Sắp xếp theo phần thập phân giảm dần để phân bổ phần dư công bằng nhất
  const sorted = [...baseAmounts].sort((a, b) => b.fractional - a.fractional);

  for (let i = 0; i < sorted.length && remainder > 0; i++) {
    sorted[i].amount += 1;
    remainder -= 1;
  }

  // Trả về theo thứ tự ban đầu của participants
  return participants.map((p) => ({
    participantId: p.participantId,
    amount: sorted.find((s) => s.participantId === p.participantId)!.amount,
  }));
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

  return participantIds.map((id) => ({
    id,
    balance: balanceMap.get(id) ?? 0,
  }));
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
