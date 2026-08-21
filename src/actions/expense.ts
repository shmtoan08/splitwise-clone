"use server";

// TODO: Implement expense Server Actions
// - addExpense(data): Tạo Expense + ExpenseSplit trong 1 transaction
//   Phải dùng splitEvenly/splitByShares từ utils/algorithm.ts
//   Phải validate tổng splits === expense.amount trước khi lưu
// - updateExpense(data): Update với optimistic locking (check version)
// - deleteExpense(expenseId): Xoá expense (cascade delete splits tự động)

import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function addExpense(_data: unknown) {
  // TODO: validate → calculate splits → prisma.$transaction([createExpense, createSplits])
  void prisma;
  void z;
  throw new Error("Not implemented yet");
}

export async function updateExpense(_data: unknown) {
  // TODO: optimistic locking — updateMany với where: { id, version: currentVersion }
  throw new Error("Not implemented yet");
}

export async function deleteExpense(_expenseId: string) {
  // TODO: prisma.expense.delete (splits cascade)
  throw new Error("Not implemented yet");
}
