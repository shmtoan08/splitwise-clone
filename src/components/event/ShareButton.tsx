"use client";
// TODO: Copy link hoặc hiển thị QR code để chia sẻ link event
export default function ShareButton({ eventId }: { eventId: string }) {
  return <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/e/${eventId}`)}>Share {eventId}</button>;
}
