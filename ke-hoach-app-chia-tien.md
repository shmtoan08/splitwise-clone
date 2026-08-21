# Kế hoạch Kỹ thuật: App Chia Tiền Nhóm (Solo Dev)

## 1. Môi trường công nghệ

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js (App Router) | Server Actions / Route Handlers cho backend |
| Database | PostgreSQL | Qua Supabase hoặc Neon |
| ORM | Prisma | Type-safe, tốc độ dev nhanh |
| Hosting Web | Vercel | Deploy từ GitHub, 1 click |
| Hosting DB | Supabase / Neon | Free tier, dễ nối Vercel |
| Connection pooling | PgBouncer hoặc Prisma Accelerate | **Bắt buộc** với Vercel serverless — nếu không sẽ dính lỗi "too many connections" khi có traffic |

## 2. Thiết kế Database

Nguyên tắc cốt lõi: dùng bảng trung gian `ExpenseSplit` để hỗ trợ chia tiền không đều, thay vì chia tổng đơn giản.

**Các thay đổi so với bản gốc:**
- `Float` → `Int` (lưu theo đơn vị đồng, tránh sai số làm tròn khi cộng dồn nhiều dòng)
- Thêm `onDelete: Cascade` để xoá Event không để lại rác
- Thêm ràng buộc unique để tránh 1 người bị chia trùng trong cùng 1 khoản chi
- Thêm index cho các cột hay được lọc
- Thêm `updatedAt`, trạng thái đã "settle" chưa, và `version` để tránh ghi đè khi 2 người sửa cùng lúc

```prisma
model Event {
  id           String        @id @default(uuid())
  title        String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  participants Participant[]
  expenses     Expense[]
}

model Participant {
  id            String         @id @default(cuid())
  eventId       String
  userId        String?        // Bỏ trống nếu là khách không đăng nhập
  name          String
  deviceToken   String?        @unique // Token ẩn danh gắn khi chọn tên lần đầu trên 1 thiết bị
  createdAt     DateTime       @default(now())
  event         Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)

  paidExpenses    Expense[]      @relation("PaidBy")
  createdExpenses Expense[]      @relation("CreatedBy")
  owedSplits      ExpenseSplit[]
  settlementsSent     Settlement[] @relation("SettlementFrom")
  settlementsReceived Settlement[] @relation("SettlementTo")

  @@index([eventId])
}

model Expense {
  id          String         @id @default(cuid())
  eventId     String
  title       String
  amount      Int            // Đơn vị: đồng (VND), không dùng Float
  payerId     String
  createdById String?        // Participant đã tạo khoản chi này — để hiển thị "ai đã thêm", không dùng để chặn cứng
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  version     Int            @default(0) // optimistic locking

  event       Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  payer       Participant    @relation("PaidBy", fields: [payerId], references: [id])
  createdBy   Participant?   @relation("CreatedBy", fields: [createdById], references: [id])
  splits      ExpenseSplit[]

  @@index([eventId])
}

model ExpenseSplit {
  id            String      @id @default(cuid())
  expenseId     String
  participantId String
  amount        Int         // Đơn vị: đồng (VND)

  expense       Expense     @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  participant   Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([expenseId, participantId]) // 1 người chỉ xuất hiện 1 lần / 1 khoản chi
  @@index([participantId])
}

// Ghi nhận các lần chuyển khoản thực tế + trạng thái xác nhận 2 chiều
model Settlement {
  id           String           @id @default(cuid())
  eventId      String
  fromId       String           // người trả nợ (con nợ)
  toId         String           // người nhận nợ (chủ nợ)
  amount       Int
  status       SettlementStatus @default(PENDING)
  createdAt    DateTime         @default(now())
  confirmedAt  DateTime?        // thời điểm bên nhận xác nhận

  from         Participant      @relation("SettlementFrom", fields: [fromId], references: [id])
  to           Participant      @relation("SettlementTo", fields: [toId], references: [id])

  @@index([eventId])
}

enum SettlementStatus {
  PENDING            // Chưa ai bấm gì
  MARKED_PAID        // Bên nợ (A) đã bấm "Đã chuyển tiền" — chờ B xác nhận
  CONFIRMED          // Bên nhận (B) đã bấm "Đã nhận được" — coi như xong
}
```

## 3. Luồng xử lý chi phí "Chia không đều"

**Giao diện nhập liệu (UI):**
1. Nhập tên khoản chi: "Cà phê Starbucks"
2. Nhập tổng tiền: 200,000 VND
3. Chọn người trả tiền
4. Chọn người tham gia chia (checkbox), mặc định check tất cả
5. Tuỳ chọn nâng cao: nhập số tiền hoặc % cụ thể cho từng người

**Xử lý chia đều — tính ở Server Action, không tính ở FE:**

Vấn đề: 100,000 chia 3 người = 33,333.33... — không chia hết. Cần một hàm chia có xử lý phần dư để tổng các `ExpenseSplit.amount` luôn khớp chính xác `Expense.amount`.

```ts
// utils/splitEvenly.ts
function splitEvenly(totalAmount: number, participantIds: string[]) {
  const n = participantIds.length;
  const base = Math.floor(totalAmount / n);
  const remainder = totalAmount - base * n;

  return participantIds.map((id, index) => ({
    participantId: id,
    // Người đầu tiên trong danh sách nhận phần dư (vài đồng lẻ)
    amount: index < remainder ? base + 1 : base,
  }));
}
```

**Lưu vào Database (Server Action):**
Tạo 1 record `Expense`, sau đó tạo các record `ExpenseSplit` tương ứng — luôn tính trong 1 transaction (`prisma.$transaction`) để đảm bảo không bao giờ có Expense mà thiếu Split, hoặc ngược lại.

## 4. Thuật toán tính nợ & tối ưu giao dịch (Settlement)

**Bước 1 — Tính Balance từng người** (giữ nguyên logic gốc, đúng):
```
Balance = Tổng đã trả (Total Paid) - Tổng phải chịu (Total Owed)
```
- Balance dương (+): người này cần được hoàn tiền
- Balance âm (-): người này còn nợ

**Bước 2 — Debt simplification (thuật toán tham lam)**

Nếu chỉ match nợ thô theo từng cặp gốc, số giao dịch sẽ rất nhiều và rối. Nên dùng thuật toán tối thiểu hoá số lần chuyển khoản:

```ts
function simplifyDebts(balances: { id: string; balance: number }[]) {
  const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);

  const transactions: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.balance, creditor.balance);

    transactions.push({ from: debtor.id, to: creditor.id, amount });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (debtor.balance === 0) i++;
    if (creditor.balance === 0) j++;
  }

  return transactions; // Số giao dịch tối thiểu để mọi người hoà vốn
}
```

Kết quả: thay vì mỗi người nợ phải trả riêng cho từng người khác, thuật toán này gộp lại thành số lượt chuyển khoản ít nhất có thể (tối đa `n - 1` giao dịch cho `n` người).

**Bước 3 — Xác nhận thanh toán 2 chiều (không cần đăng nhập vẫn an toàn)**

Thay vì 1 người tự bấm "đã trả" là gạch nợ ngay, luồng xác nhận gồm 2 bước bắt buộc, cả 2 phía đều thao tác trên cùng màn hình danh sách nợ:

1. Màn hình chốt sổ hiện: "A nợ B 500,000 VNĐ".
2. **A** (người nợ) bấm "Đã chuyển tiền" → `Settlement.status: PENDING → MARKED_PAID`. Lúc này màn hình của B sẽ hiện nút "Xác nhận đã nhận" thay vì tự động gạch nợ.
3. **B** (người nhận) bấm "Đã nhận được" → `Settlement.status: MARKED_PAID → CONFIRMED`. Chỉ khi trạng thái này = `CONFIRMED` thì khoản nợ mới được coi là xong và loại khỏi danh sách nợ hiển thị.

Vì phải có xác nhận từ đúng 2 phía, một người dù giả danh A cũng không thể tự ý đóng khoản nợ nếu B không xác nhận — an toàn cho cả trường hợp có đăng nhập lẫn không.

**Bước 4 — Soft token binding (lớp bảo vệ nhẹ, không bắt đăng nhập)**

Xác nhận 2 chiều xử lý được rủi ro chính (tự ý gạch nợ khống), nhưng vẫn còn kẽ hở nhỏ: ai cũng có thể mở link, tự chọn tên "B", rồi bấm xác nhận thay B thật. Để giảm rủi ro này mà không phá vỡ tinh thần "zero-barrier":

- Khi 1 người chọn tên lần đầu trên 1 thiết bị (vd: chọn "B"), hệ thống sinh 1 `deviceToken` ngẫu nhiên, lưu vào cookie/localStorage trên thiết bị đó và gắn vào `Participant.deviceToken`.
- Lần sau mở lại link trên **cùng thiết bị**, app tự nhận diện "bạn là B" mà không cần hỏi lại.
- Nút "Xác nhận đã nhận được" của B chỉ hiển thị/thao tác được khi cookie trên thiết bị khớp `deviceToken` của B. Người khác vẫn xem được trạng thái, nhưng không bấm hộ được.
- Đây là ràng buộc **mềm**: vẫn cho phép người dùng "đổi tên"/chọn lại nếu dùng chung thiết bị hoặc mất cookie — không khoá cứng, không yêu cầu mật khẩu, giữ đúng trải nghiệm 1-click ban đầu.
- Áp dụng tương tự cho việc tạo/sửa `Expense`: lưu `createdById` (tham chiếu `deviceToken` hiện tại) để hiển thị "ai đã thêm khoản này" — chỉ mang tính minh bạch, không chặn người khác sửa, vì mục tiêu là giữ trải nghiệm mở, tin tưởng giữa bạn bè trong nhóm.

## 5. Các rủi ro cần lưu ý (đã biết, chấp nhận cho MVP)

- **Access control**: Event dùng UUID làm link chia sẻ — ai có link đều sửa/xoá được. Phù hợp cho MVP không cần đăng nhập, nhưng cần ý thức rõ đây là đánh đổi, không phải sơ suất.
- **Giả danh vẫn có thể xảy ra ở mức thấp**: soft token binding chỉ chống nhầm lẫn/giả danh tình cờ trên cùng thiết bị người dùng quen thuộc, không chống được người cố tình xoá cookie hoặc dùng thiết bị khác để giả danh có chủ đích. Với đối tượng dùng là nhóm bạn bè tin tưởng nhau, mức bảo vệ này được xem là đủ cho MVP.
- **Concurrency**: dùng field `version` (optimistic locking) trên `Expense` để tránh 2 người sửa cùng lúc đè dữ liệu của nhau.
- **Serverless + Prisma**: nhớ cấu hình connection pooling ngay từ đầu, đừng đợi lỗi production mới sửa.

## 6. Tóm tắt thay đổi so với bản gốc

| Vấn đề | Bản gốc | Bản cải thiện |
|---|---|---|
| Kiểu dữ liệu tiền | `Float` | `Int` (đơn vị đồng) |
| Rounding khi chia | Không đề cập | Hàm `splitEvenly` xử lý phần dư |
| Cascade delete | Thiếu | Đã thêm |
| Trùng participant/expense | Không ràng buộc | `@@unique` |
| Settlement | Match nợ thô | Thuật toán tham lam tối thiểu hoá giao dịch |
| Lịch sử thanh toán | Không có | Bảng `Settlement` |
| Xác nhận thanh toán | Không có | 2 chiều: `PENDING → MARKED_PAID → CONFIRMED` |
| Giả danh danh tính | Không xử lý | Soft `deviceToken` binding (không bắt đăng nhập) |
| Attribution khoản chi | Không có | `Expense.createdById` để hiển thị "ai đã thêm" |
| Concurrency | Không có | `version` field |
| DB connection (serverless) | Không đề cập | Pooling bắt buộc |
