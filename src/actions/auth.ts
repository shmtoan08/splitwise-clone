"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema, ResetPasswordSchema, NewPasswordSchema } from "@/schemas/auth.schema";
import { generateVerificationToken, generatePasswordResetToken } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";

export async function registerUser(input: unknown): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const parsed = RegisterSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { email, password, locale } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "email_exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Generate token & send verification email
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken.token, locale);

    return { success: true, message: "verification_email_sent" };
  } catch (error) {
    console.error("[registerUser] Error:", error);
    return { success: false, error: "system_error" };
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!token) {
      return { success: false, error: "missing_token" };
    }

    const existingToken = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!existingToken) {
      return { success: false, error: "token_not_found" };
    }

    const hasExpired = new Date() > new Date(existingToken.expires);
    if (hasExpired) {
      return { success: false, error: "token_expired" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: existingToken.identifier },
    });

    if (!existingUser) {
      return { success: false, error: "email_not_found" };
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        emailVerified: new Date(),
        email: existingToken.identifier,
      },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: existingToken.identifier,
          token: existingToken.token,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[verifyEmail] Error:", error);
    return { success: false, error: "system_error" };
  }
}

export async function resetPassword(
  emailOrInput: string | { email: string },
  locale: string = "vi"
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const rawEmail = typeof emailOrInput === "string" ? emailOrInput : emailOrInput?.email;
    const parsed = ResetPasswordSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { email } = parsed.data;

    // Tìm kiếm user trong Prisma bằng email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Nếu email tồn tại trong DB, sinh token và gửi email đặt lại mật khẩu
    if (existingUser) {
      const resetToken = await generatePasswordResetToken(email);
      await sendPasswordResetEmail(email, resetToken.token, locale);
    }

    // BẢO MẬT TỐI QUAN TRỌNG: Dù email có tồn tại hay KHÔNG, luôn trả về cùng kết quả thành công
    return { success: true, message: "reset_email_sent" };
  } catch (error) {
    console.error("[resetPassword] Error:", error);
    return { success: false, error: "system_error" };
  }
}

export async function newPassword(
  passwordOrValues: string | { password: string; confirmPassword?: string },
  token: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!token) {
      return { success: false, error: "missing_token" };
    }

    const rawPassword = typeof passwordOrValues === "string" ? passwordOrValues : passwordOrValues?.password;
    if (!rawPassword || rawPassword.length < 6) {
      return { success: false, error: "password_too_short" };
    }

    const existingToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      return { success: false, error: "invalid_token" };
    }

    const hasExpired = new Date() > new Date(existingToken.expires);
    if (hasExpired) {
      return { success: false, error: "token_expired" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: existingToken.email },
    });

    if (!existingUser) {
      return { success: false, error: "user_not_found" };
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.user.update({
      where: { email: existingToken.email },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    // BẢO MẬT TỐI QUAN TRỌNG: Xóa token đã dùng khỏi DB
    await prisma.passwordResetToken.delete({
      where: { id: existingToken.id },
    });

    return { success: true };
  } catch (error) {
    console.error("[newPassword] Error:", error);
    return { success: false, error: "system_error" };
  }
}



