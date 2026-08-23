import { splitEvenly, validateSplitSum } from "../src/utils/algorithm";

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

runTest("100,000 chia 3 người", () => {
  const splits = splitEvenly(100000, ["A", "B", "C"]);
  validateSplitSum(100000, splits);
  assertEqual(splits[0].amount, 33334, "A nhận 33334");
  assertEqual(splits[1].amount, 33333, "B nhận 33333");
  assertEqual(splits[2].amount, 33333, "C nhận 33333");
});

runTest("100,000 chia 4 người", () => {
  const splits = splitEvenly(100000, ["A", "B", "C", "D"]);
  validateSplitSum(100000, splits);
  assertEqual(splits[0].amount, 25000, "A nhận 25000");
  assertEqual(splits[3].amount, 25000, "D nhận 25000");
});

runTest("1 người duy nhất", () => {
  const splits = splitEvenly(50000, ["A"]);
  validateSplitSum(50000, splits);
  assertEqual(splits[0].amount, 50000, "A nhận toàn bộ 50000");
});

runTest("2 đồng chia 5 người", () => {
  const splits = splitEvenly(2, ["A", "B", "C", "D", "E"]);
  validateSplitSum(2, splits);
  assertEqual(splits[0].amount, 1, "A nhận 1");
  assertEqual(splits[1].amount, 1, "B nhận 1");
  assertEqual(splits[2].amount, 0, "C nhận 0");
  assertEqual(splits[3].amount, 0, "D nhận 0");
  assertEqual(splits[4].amount, 0, "E nhận 0");
});

runTest("Ném lỗi khi totalAmount <= 0", () => {
  try {
    splitEvenly(0, ["A", "B"]);
    throw new Error("Không ném lỗi");
  } catch (error: any) {
    assertEqual(error.message, "splitEvenly: totalAmount phải lớn hơn 0", "Lỗi chính xác");
  }
});

runTest("Ném lỗi khi participantIds rỗng", () => {
  try {
    splitEvenly(100000, []);
    throw new Error("Không ném lỗi");
  } catch (error: any) {
    assertEqual(error.message, "splitEvenly: participantIds không được rỗng", "Lỗi chính xác");
  }
});

console.log("=== DONE ===");
