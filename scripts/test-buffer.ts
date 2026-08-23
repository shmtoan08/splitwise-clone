import "dotenv/config";
import Module from "module";

let currentMockCookie = "";

const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === "next/headers") {
    return {
      cookies: () => ({
        get: (name: string) => ({
          value: name === "split-app-device-token" ? currentMockCookie : undefined
        })
      })
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Now import the actions after the mock is set up
import { prisma } from "../src/lib/prisma";
import { addExpense } from "../src/actions/expense";
import { markAsPaid, confirmReceived } from "../src/actions/settlement";

function setMockCookie(token: string) {
  currentMockCookie = token;
}

async function runTests() {
  console.log("=== RUNNING BUFFER TESTS ===");
  
  // Create a temporary event and participants
  const event = await prisma.event.create({
    data: {
      title: "Test Buffer",
      currency: "VND",
    }
  });

  const p1 = await prisma.participant.create({
    data: { eventId: event.id, name: "P1", deviceToken: "token1" }
  });

  const p2 = await prisma.participant.create({
    data: { eventId: event.id, name: "P2", deviceToken: "token2" }
  });

  console.log("1. addExpense với tổng ExpenseSplit không khớp");
  const addRes = await addExpense({
    eventId: event.id,
    title: "Test sai amount",
    amount: 100000,
    payerId: p1.id,
    splitConfig: {
      mode: "CUSTOM",
      splits: [
        { participantId: p1.id, amount: 50000 },
        { participantId: p2.id, amount: 40000 } // Tổng là 90k != 100k
      ]
    }
  });
  if (!addRes.success) {
    console.log("✅ Bị từ chối đúng:", addRes.error);
  } else {
    console.error("❌ Lỗi: addExpense không chặn splits sai tổng!");
  }

  console.log("2. markAsPaid với fromId không khớp deviceToken");
  setMockCookie("token2"); // Giả danh P2
  const markRes1 = await markAsPaid({
    eventId: event.id,
    fromId: p1.id, // Nhưng nỗ lực markAsPaid cho P1
    toId: p2.id,
    amount: 50000
  });
  if (!markRes1.success) {
    console.log("✅ Bị từ chối đúng:", markRes1.error);
  } else {
    console.error("❌ Lỗi: markAsPaid cho phép giả mạo fromId!");
  }

  console.log("3. markAsPaid 2 lần liên tiếp (idempotent)");
  setMockCookie("token1"); // P1 chính chủ
  const markRes2 = await markAsPaid({
    eventId: event.id,
    fromId: p1.id,
    toId: p2.id,
    amount: 50000
  });
  
  const markRes3 = await markAsPaid({
    eventId: event.id,
    fromId: p1.id,
    toId: p2.id,
    amount: 50000
  });
  
  const settlements = await prisma.settlement.findMany({
    where: { eventId: event.id }
  });
  if (settlements.length === 1 && markRes2.success && markRes3.success) {
    console.log("✅ Không tạo trùng settlement. Số lượng DB:", settlements.length);
  } else {
    console.error("❌ Lỗi: Tạo trùng settlement hoặc action thất bại.");
  }

  console.log("4. confirmReceived khi Settlement đang PENDING");
  // Tạo thủ công 1 PENDING
  const pendingSettle = await prisma.settlement.create({
    data: {
      eventId: event.id,
      fromId: p1.id,
      toId: p2.id,
      amount: 20000,
      status: "PENDING"
    }
  });
  
  setMockCookie("token2"); // B là người nhận
  const confirmRes1 = await confirmReceived({
    settlementId: pendingSettle.id
  });
  if (!confirmRes1.success) {
    console.log("✅ Bị từ chối đúng:", confirmRes1.error);
  } else {
    console.error("❌ Lỗi: confirmReceived cho phép khi đang PENDING!");
  }

  // Cleanup
  await prisma.event.delete({ where: { id: event.id } });
  console.log("=== DONE ===");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());

