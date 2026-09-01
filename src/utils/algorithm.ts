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

export type RoundingModeType = "ROUND_ROBIN" | "ROUND_UP";

export type SplitResult = {
  participantId: string;
  /** Số tiền participant phải chịu — đơn vị đồng (Int) */
  amount: number;
  /** Đánh dấu người nhận thêm +1 đơn vị tiền lẻ trong ROUND_ROBIN */
  isExtra?: boolean;
};

export type SplitCalculationResult = {
  splits: SplitResult[];
  /** Số tiền dôi ra khi chia theo ROUND_UP (tích lũy vào Quỹ dư sự kiện) */
  surplus: number;
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
// splitEvenly — Chia đều có xử lý phần dư (ROUND_ROBIN / ROUND_UP)
// ---------------------------------------------------------------------------

export type EvenParticipantInput = 
  | string 
  | { id: string; remainderBurden?: number };

/**
 * Chia `totalAmount` đều cho danh sách người tham gia theo chế độ làm tròn:
 * - ROUND_ROBIN (Gánh luân phiên - Mặc định): Tổng splits khớp 100% bill. Ưu tiên người có remainderBurden thấp nhất nhận +1.
 * - ROUND_UP (Làm tròn lên cào bằng): Math.ceil cho mọi người, tiền dôi ra tính vào `surplus`.
 */
export function splitEvenly(
  totalAmount: number,
  participants: EvenParticipantInput[],
  mode: RoundingModeType = "ROUND_ROBIN"
): SplitCalculationResult {
  const normalized = participants.map((p) => {
    if (typeof p === "string") {
      return { id: p, remainderBurden: 0 };
    }
    return { id: p.id, remainderBurden: p.remainderBurden ?? 0 };
  });

  if (normalized.length === 0 || totalAmount <= 0) {
    return {
      splits: normalized.map((p) => ({ participantId: p.id, amount: 0, isExtra: false })),
      surplus: 0,
    };
  }

  const n = normalized.length;

  if (mode === "ROUND_UP") {
    const perPerson = Math.ceil(totalAmount / n);
    const totalCollected = perPerson * n;
    const surplus = totalCollected - totalAmount;

    const splits = normalized.map((p) => ({
      participantId: p.id,
      amount: perPerson,
      isExtra: false,
    }));

    validateSplitSum(totalAmount, splits, surplus);
    return { splits, surplus };
  }

  // Chế độ ROUND_ROBIN (Mặc định)
  const base = Math.floor(totalAmount / n);
  const leftover = totalAmount - base * n;

  // Sắp xếp ưu tiên: người có remainderBurden nhỏ nhất được ưu tiên gánh trước
  const ranked = [...normalized].sort(
    (a, b) => a.remainderBurden - b.remainderBurden || a.id.localeCompare(b.id)
  );
  const extraIds = new Set(ranked.slice(0, leftover).map((p) => p.id));

  const splits = normalized.map((p) => ({
    participantId: p.id,
    amount: extraIds.has(p.id) ? base + 1 : base,
    isExtra: extraIds.has(p.id),
  }));

  validateSplitSum(totalAmount, splits, 0);
  return { splits, surplus: 0 };
}

// ---------------------------------------------------------------------------
// splitByShares — Chia theo tỷ lệ (shares) có xử lý phần dư
// ---------------------------------------------------------------------------

export type ShareInput = {
  participantId: string;
  /** Số phần (shares) participant này nhận. Có thể là số thập phân dương (VD: 1.5, 2.0). */
  shares: number;
  /** Tổng số lần đã gánh tiền lẻ trong lịch sử */
  remainderBurden?: number;
};

/**
 * Chia `totalAmount` theo tỷ lệ shares:
 * - ROUND_ROBIN: Phân bổ phần lẻ cho người có phần thập phân lớn nhất -> remainderBurden nhỏ nhất.
 * - ROUND_UP: Math.ceil cho từng người, tổng chênh lệch ghi nhận vào surplus.
 */
export function splitByShares(
  totalAmount: number,
  participants: ShareInput[],
  mode: RoundingModeType = "ROUND_ROBIN"
): SplitCalculationResult {
  const totalShares = participants.reduce((sum, p) => sum + p.shares, 0);
  if (participants.length === 0 || totalShares <= 0 || totalAmount <= 0) {
    return {
      splits: participants.map((p) => ({ participantId: p.participantId, amount: 0, isExtra: false })),
      surplus: 0,
    };
  }

  if (mode === "ROUND_UP") {
    const raw = participants.map((p) => {
      const exact = (totalAmount * p.shares) / totalShares;
      const ceil = Math.ceil(exact);
      return { participantId: p.participantId, amount: ceil, isExtra: false };
    });

    const totalCollected = raw.reduce((s, r) => s + r.amount, 0);
    const surplus = totalCollected - totalAmount;

    const splits = raw.map((r) => ({
      participantId: r.participantId,
      amount: r.amount,
      isExtra: false,
    }));

    validateSplitSum(totalAmount, splits, surplus);
    return { splits, surplus };
  }

  // Chế độ ROUND_ROBIN
  const raw = participants.map((i) => {
    const exact = (totalAmount * i.shares) / totalShares;
    const floor = Math.floor(exact);
    return { 
      participantId: i.participantId, 
      floor, 
      remainder: exact - floor,
      remainderBurden: i.remainderBurden ?? 0,
    };
  });

  const allocated = raw.reduce((s, r) => s + r.floor, 0);
  const leftover = totalAmount - allocated;

  const ranked = [...raw].sort(
    (a, b) => 
      b.remainder - a.remainder || 
      a.remainderBurden - b.remainderBurden || 
      a.participantId.localeCompare(b.participantId)
  );
  const bonusIds = new Set(ranked.slice(0, leftover).map((r) => r.participantId));

  const splits = raw.map((r) => ({
    participantId: r.participantId,
    amount: r.floor + (bonusIds.has(r.participantId) ? 1 : 0),
    isExtra: bonusIds.has(r.participantId),
  }));

  validateSplitSum(totalAmount, splits, 0);
  return { splits, surplus: 0 };
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
 * Validate tổng splits có khớp với totalAmount (+ surplus nếu ROUND_UP) không.
 * Ném lỗi nếu không khớp — phải gọi trước khi lưu vào DB.
 */
export function validateSplitSum(
  totalAmount: number,
  splits: Array<{ amount: number }>,
  surplus: number = 0
): void {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  if (sum !== totalAmount + surplus) {
    throw new Error(
      `Tổng các phần chia (${sum}đ) không khớp với số tiền khoản chi (${totalAmount}đ + dư ${surplus}đ).`
    );
  }
}
