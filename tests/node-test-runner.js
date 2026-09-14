/**
 * node-test-runner.js - CLI runner for AgendaVault unit test suite
 */

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

import { runAllTests } from './test-suite.js';

async function main() {
  console.log('Running AgendaVault Unit Tests in Node.js...\n');
  const results = await runAllTests();

  let passed = 0;
  let failed = 0;

  results.forEach(res => {
    if (res.passed) {
      passed++;
      console.log(`[PASS] (${res.duration}ms) [${res.group}] ${res.name}`);
    } else {
      failed++;
      console.error(`[FAIL] (${res.duration}ms) [${res.group}] ${res.name}`);
      console.error(`       Error: ${res.error}\n`);
    }
  });

  console.log(`\n==============================`);
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`==============================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
