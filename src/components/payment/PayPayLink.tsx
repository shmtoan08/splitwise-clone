// TODO: Build PayPay payment link cho người dùng Nhật
// Format: https://paypay.ne.jp/payment/{payPayId}?amount={amount}
export default function PayPayLink({ payPayId, amount }: { payPayId: string; amount: number }) {
  const url = `https://paypay.ne.jp/payment/${payPayId}?amount=${amount}`;
  return <a href={url} target="_blank" rel="noopener noreferrer">Thanh toán qua PayPay</a>;
}
