# Cấu trúc Project: my-split-app (Đã cải thiện)

```
my-split-app/
├── prisma/
│   └── schema.prisma                # Chứa cấu trúc DB (Event, Participant, Expense, Settlement...)
│
├── src/
│   ├── actions/                     # [QUAN TRỌNG] Server Actions (Giao tiếp DB)
│   │   ├── event.ts                 # createEvent, getEventById
│   │   ├── participant.ts           # addParticipant, removeParticipant,
│   │   │                            # claimParticipantIdentity (gắn deviceToken khi chọn tên lần đầu)
│   │   ├── expense.ts                # addExpense, deleteExpense, updateExpense
│   │   └── settlement.ts             # calculateBalances, markAsPaid (A -> MARKED_PAID),
│   │                                  # confirmReceived (B -> CONFIRMED)
│   │                                  # Cả 2 hàm mark/confirm đều validate deviceToken ở server,
│   │                                  # không tin dữ liệu client gửi lên
│   │
│   ├── app/
│   │   ├── [locale]/                 # Gói toàn bộ UI vào đây để hỗ trợ đa ngôn ngữ (i18n)
│   │   │   ├── (dashboard)/          # Route Group: các trang cần đăng nhập
│   │   │   │   ├── layout.tsx        # Check auth tại đây (đơn giản hơn compose vào middleware)
│   │   │   │   └── page.tsx          # Dashboard: danh sách nhóm đã tham gia
│   │   │   │
│   │   │   ├── e/                    # Viết tắt "Event" cho link ngắn gọn (VD: /e/uuid)
│   │   │   │   └── [eventId]/
│   │   │   │       ├── page.tsx              # Chi tiết Sự kiện (chi phí, thành viên)
│   │   │   │       ├── loading.tsx           # Skeleton khi tải Event
│   │   │   │       ├── error.tsx             # Xử lý lỗi (vd: query DB fail)
│   │   │   │       ├── not-found.tsx         # UUID sai / Event đã bị xoá
│   │   │   │       ├── settlement/
│   │   │   │       │   └── page.tsx          # Trang Chốt sổ (ai nợ ai, VietQR, PayPay)
│   │   │   │       └── layout.tsx            # Layout dùng chung cho Sự kiện (Header tên nhóm)
│   │   │   │
│   │   │   ├── layout.tsx            # Root Layout (cấp [locale])
│   │   │   └── page.tsx              # Trang chủ: input tạo nhóm + nhóm gần đây (LocalStorage)
│   │   │
│   │   └── api/                      # Route Handlers (REST API nếu cần)
│   │       └── auth/
│   │           └── [...nextauth]/route.ts
│   │
│   ├── components/                   # UI Components
│   │   ├── core/                     # Button, Modal, Input... (shadcn/ui)
│   │   ├── event/
│   │   │   ├── ExpenseForm.tsx       # Form chính, chỉ điều phối — không chứa logic từng kiểu chia
│   │   │   ├── split-modes/          # Tách riêng từng kiểu chia để dễ maintain
│   │   │   │   ├── EvenSplit.tsx
│   │   │   │   ├── CustomAmountSplit.tsx
│   │   │   │   └── SharesSplit.tsx
│   │   │   ├── CurrencySelector.tsx  # Chọn currency + hiển thị tỷ giá snapshot
│   │   │   ├── ParticipantList.tsx
│   │   │   └── ShareButton.tsx       # Nút copy link/QR code
│   │   └── payment/
│   │       ├── VietQR.tsx            # Build URL ảnh QR (qua lib/vietqr.ts), không cần API route riêng
│   │       └── PayPayLink.tsx
│   │
│   ├── hooks/                        # Custom React Hooks
│   │   ├── useRecentEvents.ts        # Xử lý LocalStorage (lưu & lấy danh sách UUID gần đây)
│   │   └── useParticipantIdentity.ts # Đọc/ghi deviceToken (cookie), biết "mình là ai" trong Event hiện tại
│   │
│   ├── i18n/                         # Cấu hình đa ngôn ngữ (Next-Intl)
│   │   ├── routing.ts                # Định nghĩa locale (vi, ja)
│   │   ├── request.ts                # Logic load file JSON
│   │   └── messages/
│   │       ├── vi.json
│   │       └── ja.json
│   │
│   ├── lib/                          # Cấu hình / tiện ích core
│   │   ├── prisma.ts                 # Khởi tạo Prisma Client (singleton)
│   │   ├── auth.ts                   # NextAuth config (providers, session callback, claim-event logic)
│   │   ├── vietqr.ts                 # Hàm build URL VietQR (format số tiền, nội dung chuyển khoản)
│   │   └── utils.ts                  # formatCurrency, cn cho Tailwind...
│   │
│   ├── schemas/                      # [QUAN TRỌNG] Zod Schemas — tách theo domain
│   │   ├── event.schema.ts
│   │   ├── expense.schema.ts         # gồm EvenSplit / CustomAmountSplit / SharesSplit
│   │   ├── participant.schema.ts
│   │   └── settlement.schema.ts
│   │
│   ├── types/                        # Type không map trực tiếp DB
│   │   └── index.ts                  # vd: kết quả simplifyDebts(), props dùng chung
│   │
│   └── utils/                        # Logic nghiệp vụ độc lập (không dính React)
│       ├── algorithm.ts              # Thuật toán đối trừ nợ (Smart Settlement)
│       └── currency.ts               # convertToBaseCurrency(), formatMultiCurrency()
│
├── middleware.ts                     # CHỈ xử lý i18n redirect (KHÔNG gánh thêm auth check —
│                                      # auth được kiểm tra ở (dashboard)/layout.tsx để tránh xung đột)
├── .cursorrules                      # File rule cho AI Agent
├── tailwind.config.ts
└── package.json
```

## Tóm tắt các thay đổi so với bản gốc

| Vấn đề | Bản gốc | Bản cải thiện |
|---|---|---|
| Participant identity (deviceToken) | Không có vị trí rõ ràng | `hooks/useParticipantIdentity.ts` + `actions/participant.ts` (`claimParticipantIdentity`) |
| Settlement 2 chiều | 1 hàm `markAsPaid` | 2 hàm: `markAsPaid` (A) + `confirmReceived` (B), validate token ở server |
| Đa tiền tệ | Không có chỗ xử lý | `utils/currency.ts` + `components/event/CurrencySelector.tsx` |
| Zod schemas | Gộp 1 file `index.ts` | Tách theo domain: `event`, `expense`, `participant`, `settlement` |
| Auth + i18n middleware | Gộp chung, dễ xung đột | Middleware chỉ lo i18n; auth check chuyển vào `(dashboard)/layout.tsx` |
| NextAuth config | Chỉ có route handler | Thêm `lib/auth.ts` chứa providers, callbacks, claim-event logic |
| VietQR component | Ghi "gọi API" mơ hồ | Rõ ràng: build URL qua `lib/vietqr.ts`, không cần API route riêng |
| Next.js convention files | Thiếu | Thêm `loading.tsx`, `error.tsx`, `not-found.tsx` cho `/e/[eventId]` |
| ExpenseForm | 1 file lớn xử lý mọi kiểu chia | Tách `split-modes/EvenSplit.tsx`, `CustomAmountSplit.tsx`, `SharesSplit.tsx` |
| Types dùng chung | Không có | `types/index.ts` |
