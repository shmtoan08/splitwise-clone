// Server Component — build URL VietQR rồi render <img>
// Không cần gọi API riêng, dùng buildVietQRUrl từ lib/vietqr.ts
import { buildVietQRUrl } from "@/lib/vietqr";
type Props = { bankId: string; accountNumber: string; amount: number; description?: string };
export default function VietQR({ bankId, accountNumber, amount, description }: Props) {
  const qrUrl = buildVietQRUrl({ bankId, accountNumber, amount, description });
  return <img src={qrUrl} alt="VietQR" className="w-48 h-48" />;
}
