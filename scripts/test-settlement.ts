import "dotenv/config";
import { calculateBalances, simplifyDebts } from "../src/utils/algorithm";
import { calculateEventBalances } from "../src/actions/settlement";
import { prisma } from "../src/lib/prisma";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${name}: ${error.message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
  }
}

console.log("=== RUNNING SETTLEMENT TESTS ===");

runTest("Case 2 người: A trả 200k, chia đều A, B (mỗi người 100k)", () => {
  const expenses = [
    {
      payerId: "A",
      splits: [
        { participantId: "A", amount: 100000 },
        { participantId: "B", amount: 100000 },
      ]
    }
  ];
  const balances = calculateBalances(["A", "B"], expenses);
  assertEqual(balances, [
    { id: "A", balance: 100000 },
    { id: "B", balance: -100000 }
  ], "Balances chính xác");

  const debts = simplifyDebts(balances);
  assertEqual(debts, [
    { from: "B", to: "A", amount: 100000 }
  ], "Giao dịch chính xác: B trả A 100k");
});

runTest("Case ví dụ gốc: Toàn trả 200k (uống 100k), Oanh không trả (uống 100k)", () => {
  const expenses = [
    {
      payerId: "Toan",
      splits: [
        { participantId: "Toan", amount: 100000 },
        { participantId: "Oanh", amount: 100000 },
      ]
    }
  ];
  const balances = calculateBalances(["Toan", "Oanh"], expenses);
  assertEqual(balances, [
    { id: "Toan", balance: 100000 },
    { id: "Oanh", balance: -100000 }
  ], "Balances chính xác: Toàn +100k, Oanh -100k");
});

runTest("Case nhiều người (5 participant), nhiều expense chồng chéo", () => {
  const expenses = [
    {
      payerId: "A", // Trả 300k
      splits: [
        { participantId: "A", amount: 100000 },
        { participantId: "B", amount: 100000 },
        { participantId: "C", amount: 100000 },
      ]
    },
    {
      payerId: "B", // Trả 150k
      splits: [
        { participantId: "A", amount: 50000 },
        { participantId: "D", amount: 50000 },
        { participantId: "E", amount: 50000 },
      ]
    }
  ];
  const participants = ["A", "B", "C", "D", "E"];
  const balances = calculateBalances(participants, expenses);
  
  // Tổng = 0
  const sum = balances.reduce((acc, b) => acc + b.balance, 0);
  assertEqual(sum, 0, "Tổng balance = 0");

  const debts = simplifyDebts(balances);
  
  // Số giao dịch <= n-1
  if (debts.length > participants.length - 1) {
    throw new Error(`Số giao dịch ${debts.length} > ${participants.length - 1}`);
  }

  // Áp dụng giao dịch xem có về 0 hết không
  const balancesAfter = balances.map(b => ({ ...b }));
  for (const d of debts) {
    const from = balancesAfter.find(b => b.id === d.from)!;
    const to = balancesAfter.find(b => b.id === d.to)!;
    from.balance += d.amount;
    to.balance -= d.amount;
  }

  const allZero = balancesAfter.every(b => b.balance === 0);
  assertEqual(allZero, true, "Tất cả balance về 0 sau khi áp giao dịch");
});

runTest("Case mọi người balance = 0 sẵn", () => {
  const expenses = [
    {
      payerId: "A",
      splits: [
        { participantId: "A", amount: 100000 }
      ]
    },
    {
      payerId: "B",
      splits: [
        { participantId: "B", amount: 100000 }
      ]
    }
  ];
  const balances = calculateBalances(["A", "B"], expenses);
  assertEqual(balances, [
    { id: "A", balance: 0 },
    { id: "B", balance: 0 }
  ], "Balances = 0");

  const debts = simplifyDebts(balances);
  assertEqual(debts, [], "Giao dịch rỗng");
});

runTest("Case chỉ có 1 người trong event", () => {
  const expenses = [
    {
      payerId: "A",
      splits: [
        { participantId: "A", amount: 50000 }
      ]
    }
  ];
  const balances = calculateBalances(["A"], expenses);
  assertEqual(balances, [{ id: "A", balance: 0 }], "Balance = 0");
  
  const debts = simplifyDebts(balances);
  assertEqual(debts, [], "Giao dịch rỗng");
});

async function runIntegration() {
  console.log("\n=== RUNNING INTEGRATION TEST ===");
  try {
    const event = await prisma.event.findFirst({
      where: { expenses: { some: {} } }
    });
    if (!event) {
      console.log("Không có event nào trong DB để test integration.");
      return;
    }
    
    console.log(`Test trên event ID: ${event.id} - ${event.title}`);
    const res = await calculateEventBalances(event.id);
    
    if (!res.success) {
      console.error("❌ [FAIL] Integration test lỗi:", res.error);
    } else {
      console.log("Kết quả JSON:");
      console.log(JSON.stringify(res.data, null, 2));
      console.log("✅ [PASS] Integration test success");
    }
  } catch (e: any) {
    console.error("❌ [FAIL] Exception:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

runIntegration();
