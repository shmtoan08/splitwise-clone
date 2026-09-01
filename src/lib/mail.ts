import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailContent {
  subject: string;
  senderName: string;
  title: string;
  greeting: string;
  body: string;
  buttonText: string;
  fallbackText: string;
  expiryNotice: string;
}

const emailTranslations: Record<string, EmailContent> = {
  vi: {
    subject: "Xác thực địa chỉ email của bạn",
    senderName: "Chia Tiền Nhóm",
    title: "Xác thực tài khoản",
    greeting: "Xin chào,",
    body: "Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác nhận email của bạn bằng cách click vào nút bên dưới:",
    buttonText: "Xác nhận email",
    fallbackText: "Hoặc copy đường link này vào trình duyệt:",
    expiryNotice: "Link xác nhận này sẽ hết hạn sau 1 giờ.",
  },
  ja: {
    subject: "メールアドレスの確認",
    senderName: "割り勘アプリ",
    title: "アカウントの確認",
    greeting: "こんにちは、",
    body: "アカウント登録ありがとうございます。以下のボタンをクリックしてメールアドレスを認証してください：",
    buttonText: "メールアドレスを認証する",
    fallbackText: "または以下のリンクをブラウザに貼り付けてアクセスしてください：",
    expiryNotice: "この確認リンクの有効期限は1時間です。",
  },
};

export async function sendVerificationEmail(email: string, token: string, locale: string = "vi") {
  const currentLocale = locale === "ja" ? "ja" : "vi";
  const content = emailTranslations[currentLocale];

  const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const confirmLink = `${domain}/${currentLocale}/verify-email?token=${token}`;

  const fromSender = process.env.EMAIL_FROM || `${content.senderName} <onboarding@resend.dev>`;

  return await resend.emails.send({
    from: fromSender,
    to: email,
    subject: content.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 700;">${content.title}</h2>
        </div>
        <p style="font-size: 15px; margin-bottom: 12px;">${content.greeting}</p>
        <p style="font-size: 15px; margin-bottom: 24px; color: #475569;">${content.body}</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${confirmLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            ${content.buttonText}
          </a>
        </div>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          <p style="color: #64748b; font-size: 13px; margin-bottom: 6px;">${content.fallbackText}</p>
          <p style="font-size: 12px; word-break: break-all; margin: 0;">
            <a href="${confirmLink}" style="color: #2563eb; text-decoration: underline;">${confirmLink}</a>
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          ${content.expiryNotice}
        </p>
      </div>
    `,
  });
}

