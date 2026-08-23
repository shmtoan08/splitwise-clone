# Splitwise Clone (Web App Chia Tiền Nhóm) - Project Guidelines

## 1. Tech Stack
- **Framework:** Next.js (App Router, Server Actions)
- **Database:** PostgreSQL (qua Prisma ORM) + connection pooling (PgBouncer / Prisma Accelerate) — bắt buộc vì deploy Vercel serverless
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **i18n:** next-intl (Dynamic Routing `[locale]`)

## 2. Core Features & User Flow

### Phase 1 (MVP)
- **Không rào cản:** Tạo sự kiện không cần đăng nhập. Chia sẻ qua link (UUID).
- **Soft Identity (deviceToken):** Khi 1 người chọn tên lần đầu trên 1 thiết bị, hệ thống gắn `deviceToken` (cookie) vào `Participant` đó. Lần sau mở lại link trên cùng thiết bị, app tự nhận diện "bạn là ai". Đây là ràng buộc **mềm** — không bắt đăng nhập, không khoá cứng, chỉ dùng để giới hạn ai được bấm các hành động nhạy cảm (xác nhận đã nhận tiền, xem là "người tạo" khoản chi).
- **Flex-split:** Hỗ trợ chia đều / theo số tiền cụ thể / theo tỷ lệ (shares) cho từng thành viên. Luôn dùng hàm chia có xử lý phần dư (rounding), không chia rồi làm tròn từng phần riêng lẻ.
- **Smart Settlement (thuật toán):** Đối trừ nợ tối thiểu hoá số lần chuyển khoản (greedy: ghép người nợ nhiều nhất với người được nợ nhiều nhất).
- **Xác nhận thanh toán 2 chiều (cơ chế, tách biệt với thuật toán ở trên):**
  `PENDING → MARKED_PAID → CONFIRMED`
  1. A (người nợ) bấm "Đã chuyển tiền" → `MARKED_PAID`.
  2. B (người nhận) bấm "Đã nhận được" → `CONFIRMED`. Chỉ khi ở trạng thái này khoản nợ mới được coi là xong.
  Không bao giờ tự động đóng nợ chỉ từ 1 phía xác nhận.
- **Local Payment:** Render mã VietQR / link PayPay tại màn hình chốt sổ (build URL, không cần gọi API riêng).
- **LocalStorage:** Tự động lưu các link nhóm đã truy cập gần đây trên trình duyệt hiện tại.

### Phase 2 (Sau MVP, chưa code trong Phase 1)
- **Multi-Currency:** Chọn currency riêng cho từng khoản chi, quy đổi về currency chung của Event. Tỷ giá phải lưu **snapshot** tại thời điểm tạo Expense (`exchangeRate`, `originalAmount`, `originalCurrency`), không tính lại theo tỷ giá real-time sau này.
- **Receipt Photo:** Đính kèm ảnh hoá đơn vào Expense (cần giới hạn/nén dung lượng ảnh trước khi upload).

### Phase 3
- **Auth (Google):** Đăng nhập để lưu lịch sử, "Claim Event" (gắn sự kiện ẩn danh vào tài khoản), Dashboard tổng hợp nợ đa sự kiện.

> Nếu tính năng nào trong Phase 2/3 cần được đẩy lên MVP hoặc ngược lại, phải cập nhật lại file này trước khi giao cho AI agent code — không tự suy luận từ hội thoại cũ.

## 3. Database Schema (Core)

> Đây là bản tóm tắt. Nguồn đầy đủ (toàn bộ field, relation, index) nằm ở `prisma/schema.prisma` — file này chỉ liệt kê các field **quan trọng dễ bị bỏ sót**, không thay thế schema thật.

- **`Event`**: `id` (UUID), `title`, `createdAt`, `updatedAt`
- **`Participant`**: `id`, `eventId`, `name`, `userId` (nullable), `deviceToken` (nullable, unique — cơ chế soft identity, **bắt buộc có**), `paymentInfo` (nullable — STK/QR, dữ liệu nhạy cảm, không hiển thị công khai ngoài phạm vi Event)
- **`Expense`**: `id`, `eventId`, `title`, `amount` (**kiểu `Int`, đơn vị nhỏ nhất — KHÔNG dùng `Float`**), `payerId`, `createdById` (nullable — participant đã thêm, chỉ để hiển thị minh bạch), `version` (Int, default 0 — optimistic locking)
- **`ExpenseSplit`**: `id`, `expenseId`, `participantId`, `amount` (`Int`) — ràng buộc unique `(expenseId, participantId)`
- **`Settlement`** (bắt buộc có, không được bỏ qua khi sinh schema): `id`, `eventId`, `fromId`, `toId`, `amount` (`Int`), `status` (enum: `PENDING` / `MARKED_PAID` / `CONFIRMED`), `confirmedAt` (nullable)

## 4. AI Agent Strict Rules (`.cursorrules`)

- **Tối ưu Prisma:** CẤM dùng `include: { relations: true }` mặc định. Bắt buộc dùng `select` để chống over-fetching. Dùng `_count` khi chỉ cần đếm. Tránh N+1 queries.
- **Server/Client:** Mặc định là Server Component. Chỉ dùng `'use client'` ở component lá (UI tương tác).
- **Server Actions:** Phải validate input bằng Zod trước khi tương tác DB. Không trả về raw error của Prisma cho client.
- **i18n:** KHÔNG hardcode text tĩnh lên UI. Bắt buộc dùng `useTranslations` từ `next-intl`.
- **Tiền tệ:** Mọi field liên quan số tiền BẮT BUỘC dùng `Int` (đơn vị nhỏ nhất, ví dụ đồng VND). CẤM dùng `Float`/`Number` thập phân cho amount, tránh sai số cộng dồn.
- **Rounding khi chia tiền:** Khi chia đều hoặc theo tỷ lệ, BẮT BUỘC dùng hàm chia có xử lý phần dư (`splitEvenly` / `splitByShares` trong `utils/`). CẤM chia trực tiếp rồi làm tròn từng phần riêng lẻ — tổng các `ExpenseSplit.amount` phải khớp chính xác `Expense.amount`, validate ở Server Action trước khi lưu.
- **Settlement 2 chiều:** CẤM set `Settlement.status = CONFIRMED` trực tiếp từ 1 action duy nhất. Bắt buộc qua đúng 2 bước tách biệt: `markAsPaid` (A gọi, chuyển `PENDING → MARKED_PAID`) và `confirmReceived` (B gọi, chuyển `MARKED_PAID → CONFIRMED`). Cả 2 action đều phải validate `deviceToken` từ cookie phía server khớp với `Participant` tương ứng trước khi cho phép thực hiện — không tin `participantId` gửi từ client.
- **Optimistic locking:** Mọi Server Action update `Expense` phải check `version` hiện tại trước khi ghi, tăng `version` sau khi ghi thành công. Nếu version không khớp, trả lỗi rõ ràng để client tự reload dữ liệu mới.

## 5. Folder Structure Blueprint

> Bản đầy đủ, có giải thích, nằm ở `cau-truc-project.md` — mục dưới đây chỉ là bản tóm tắt nhanh, khi có sai khác lấy file kia làm chuẩn.

- `/src/actions/`: Server Actions
  - `event.ts`, `expense.ts`
  - `participant.ts` — gồm `claimParticipantIdentity` (gắn deviceToken)
  - `settlement.ts` — gồm `calculateBalances`, `markAsPaid`, `confirmReceived` (2 hàm tách riêng, xem mục 4)
- `/src/app/[locale]/`: Chứa UI, có i18n
  - `/e/[eventId]/`: Trang chi tiết sự kiện (kèm `loading.tsx`, `error.tsx`, `not-found.tsx`)
  - `/e/[eventId]/settlement/`: Trang chốt sổ
  - `(dashboard)/`: Route group cần đăng nhập — auth check ở `layout.tsx` của group này, **không** gộp vào `middleware.ts`
- `/src/components/`: Tách UI thành `core/`, `event/` (gồm `split-modes/` riêng cho từng kiểu chia), `payment/`
- `/src/hooks/`: `useRecentEvents.ts`, `useParticipantIdentity.ts` (đọc/ghi deviceToken)
- `/src/lib/`: `prisma.ts`, `auth.ts` (NextAuth config), `vietqr.ts` (build URL QR)
- `/src/schemas/`: Zod schemas, tách theo domain — `event.schema.ts`, `expense.schema.ts`, `participant.schema.ts`, `settlement.schema.ts`
- `/src/utils/`: Logic nghiệp vụ thuần (không dính React) — `algorithm.ts` (smart settlement), `currency.ts` (Phase 2)
- `/src/types/`: Type dùng chung không map trực tiếp DB
- `/src/i18n/`: Cấu hình đa ngôn ngữ (`vi.json`, `ja.json`)
- `middleware.ts`: CHỈ xử lý i18n redirect, không gánh thêm auth check

## 6. Nguồn tham chiếu chính (Source of Truth)

Khi có mâu thuẫn giữa các tài liệu, thứ tự ưu tiên:
1. `prisma/schema.prisma` (schema thật) — cho mọi câu hỏi về field/kiểu dữ liệu/relation
2. `cau-truc-project.md` — cho mọi câu hỏi về vị trí file/thư mục
3. `PROJECT_GUIDELINES.md` (file này) — cho quy tắc hành vi, business logic, và scope theo Phase

File này nên được cập nhật lại mỗi khi có quyết định thiết kế mới được thống nhất, để AI agent luôn có 1 nguồn rule ngắn gọn, đầy đủ, không cần tự suy luận lại từ các cuộc trò chuyện trước.

## 7. UI/UX & Design Guidelines (Giao diện & Trải nghiệm)
- **Tư duy Mobile-First:** Mọi component phải được thiết kế tối ưu cho màn hình điện thoại trước (`w-full`), sau đó mới dùng các breakpoint (`md:`, `lg:`) để mở rộng cho màn hình Desktop.
- **Tối giản (Minimalism) & "Zero-Barrier":** Thiết kế tập trung vào tính năng "Tạo nhóm trong 1 click" và "Chia sẻ 1-Click" qua URL/QR code. Loại bỏ mọi yếu tố thị giác thừa mứa.
- **Shadcn/ui là cốt lõi:** Luôn ưu tiên dùng các component có sẵn của shadcn/ui (Card, Button, Dialog, Drawer, Tabs) trước khi tự code UI custom.
- **Tương tác mượt mà:** 
  - Form thêm chi phí trên Mobile nên ưu tiên dùng `Drawer` (hiện từ dưới lên) thay vì `Dialog` (hiện giữa màn hình) để thao tác bằng một tay dễ dàng.
  - Sử dụng Skeleton Loading (của shadcn) để tạo hiệu ứng tải trang mượt mà khi fetch dữ liệu, không dùng vòng quay spinner nhàm chán.
- **Hiển thị Số tiền:** Mọi con số tiền tệ phải luôn được format có dấu phân cách (VD: `100,000` thay vì `100000`) và text được highlight màu xanh/đỏ rõ ràng khi hiển thị trạng thái Nợ/Được nhận.
