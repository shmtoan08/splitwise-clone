"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AddContactSchema } from "@/schemas/contact.schema";

export type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  contactUserId?: string | null;
};

export async function getUserContacts(): Promise<ContactItem[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const contacts = await prisma.contact.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Nếu contact có email, tìm user tương ứng trong hệ thống (nếu có)
    const emails = contacts
      .map((c) => c.email)
      .filter((email): email is string => !!email);

    const userMap = new Map<string, string>();
    if (emails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      });
      users.forEach((u) => {
        if (u.email) userMap.set(u.email.toLowerCase(), u.id);
      });
    }

    return contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      contactUserId: c.email ? userMap.get(c.email.toLowerCase()) || null : null,
    }));
  } catch (error) {
    console.error("[getUserContacts] Error:", error);
    return [];
  }
}

export async function addContact(
  input: { name: string; email?: string | null } | string
): Promise<{ success: boolean; contact?: ContactItem; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "unauthorized" };
    }

    const rawData = typeof input === "string" ? { name: input } : input;
    const parsed = AddContactSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { name, email } = parsed.data;
    const userId = session.user.id;

    // Dùng upsert để tránh tạo trùng tên trong cùng một userId
    const contact = await prisma.contact.upsert({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
      update: {
        ...(email ? { email } : {}),
      },
      create: {
        userId,
        name,
        email: email || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return { success: true, contact };
  } catch (error) {
    console.error("[addContact] Error:", error);
    return { success: false, error: "system_error" };
  }
}
