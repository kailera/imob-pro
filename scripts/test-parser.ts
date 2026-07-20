import { parseMoney } from "./ingest-contratos.js";

interface TestCase {
  input: string | undefined;
  expected: number;
}

const testCases: TestCase[] = [
  { input: "3,100.00", expected: 3100 },
  { input: "3.100,00", expected: 3100 },
  { input: "969.00", expected: 969 },
  { input: "969,00", expected: 969 },
  { input: "R$ 3.100,00", expected: 3100 },
  { input: " R$ 3,100.00 ", expected: 3100 },
  { input: "825.28", expected: 825.28 },
  { input: "825,28", expected: 825.28 },
  { input: "1.059,92", expected: 1059.92 },
  { input: "1,059.92", expected: 1059.92 },
  { input: "1.399,95", expected: 1399.95 },
  { input: "1,399.95", expected: 1399.95 },
  { input: "", expected: 0 },
  { input: undefined, expected: 0 }
];

function runTests() {
  console.log("=== RUNNING PARSEMONEY TESTS ===");
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = parseMoney(tc.input);
    const success = Math.abs(result - tc.expected) < 0.0001;

    if (success) {
      console.log(`✓ Input: "${tc.input}" -> parsed to: ${result} (Expected: ${tc.expected})`);
      passed++;
    } else {
      console.error(`✗ Input: "${tc.input}" -> parsed to: ${result} (Expected: ${tc.expected})`);
      failed++;
    }
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
