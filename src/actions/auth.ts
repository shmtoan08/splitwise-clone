"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema } from "@/schemas/auth.schema";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

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

