import { splitEvenly, splitByShares, validateSplitSum } from "../src/utils/algorithm";

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

console.log("=== RUNNING ALGORITHM TESTS ===");

// 1. ROUND_ROBIN tests
runTest("ROUND_ROBIN: 1000¥ chia 3 người (remainderBurden ban đầu = 0)", () => {
  const participants = [
    { id: "A", remainderBurden: 0 },
    { id: "B", remainderBurden: 0 },
    { id: "C", remainderBurden: 0 },
  ];
  const res = splitEvenly(1000, participants, "ROUND_ROBIN");
  validateSplitSum(1000, res.splits, res.surplus);
  assertEqual(res.surplus, 0, "Surplus phải = 0");
  assertEqual(res.splits[0].amount, 334, "A nhận 334 (do A đứng đầu theo alphabetical khi cùng burden = 0)");
  assertEqual(res.splits[0].isExtra, true, "A isExtra = true");
  assertEqual(res.splits[1].amount, 333, "B nhận 333");
  assertEqual(res.splits[2].amount, 333, "C nhận 333");
});

runTest("ROUND_ROBIN: Bill thứ 2 luân phiên (A burden = 1, B burden = 0, C burden = 0)", () => {
  const participants = [
    { id: "A", remainderBurden: 1 },
    { id: "B", remainderBurden: 0 },
    { id: "C", remainderBurden: 0 },
  ];
  const res = splitEvenly(1000, participants, "ROUND_ROBIN");
  validateSplitSum(1000, res.splits, res.surplus);
  assertEqual(res.surplus, 0, "Surplus phải = 0");
  assertEqual(res.splits[0].amount, 333, "A nhận 333 (vì A đã gánh ở bill trước)");
  assertEqual(res.splits[0].isExtra, false, "A isExtra = false");
  assertEqual(res.splits[1].amount, 334, "B nhận 334 (ưu tiên burden = 0)");
  assertEqual(res.splits[1].isExtra, true, "B isExtra = true");
  assertEqual(res.splits[2].amount, 333, "C nhận 333");
});

runTest("ROUND_ROBIN: Bill thứ 3 luân phiên (A burden = 1, B burden = 1, C burden = 0)", () => {
  const participants = [
    { id: "A", remainderBurden: 1 },
    { id: "B", remainderBurden: 1 },
    { id: "C", remainderBurden: 0 },
  ];
  const res = splitEvenly(1000, participants, "ROUND_ROBIN");
  validateSplitSum(1000, res.splits, res.surplus);
  assertEqual(res.splits[0].amount, 333, "A nhận 333");
  assertEqual(res.splits[1].amount, 333, "B nhận 333");
  assertEqual(res.splits[2].amount, 334, "C nhận 334 (đến lượt C gánh)");
  assertEqual(res.splits[2].isExtra, true, "C isExtra = true");
});

// 2. ROUND_UP tests
runTest("ROUND_UP: 1000¥ chia 3 người (cào bằng 334¥, surplus 2¥)", () => {
  const participants = ["A", "B", "C"];
  const res = splitEvenly(1000, participants, "ROUND_UP");
  validateSplitSum(1000, res.splits, res.surplus);
  assertEqual(res.surplus, 2, "Surplus phải = 2");
  assertEqual(res.splits[0].amount, 334, "A nhận 334");
  assertEqual(res.splits[1].amount, 334, "B nhận 334");
  assertEqual(res.splits[2].amount, 334, "C nhận 334");
});

runTest("ROUND_UP: 100,000đ chia theo shares (1.5 - 1 - 1)", () => {
  const participants = [
    { participantId: "A", shares: 1.5 },
    { participantId: "B", shares: 1 },
    { participantId: "C", shares: 1 },
  ];
  const res = splitByShares(100000, participants, "ROUND_UP");
  validateSplitSum(100000, res.splits, res.surplus);
  // 100000 * 1.5 / 3.5 = 42857.14 -> ceil = 42858
  // 100000 * 1 / 3.5 = 28571.42 -> ceil = 28572
  // Total = 42858 + 28572 + 28572 = 100002 -> surplus = 2
  assertEqual(res.splits[0].amount, 42858, "A nhận 42858");
  assertEqual(res.splits[1].amount, 28572, "B nhận 28572");
  assertEqual(res.splits[2].amount, 28572, "C nhận 28572");
  assertEqual(res.surplus, 2, "Surplus = 2");
});

console.log("=== ALL TESTS COMPLETED ===");
