const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const WebSocket = require('ws');
const { execSync } = require('child_process');

async function runPerformanceAudit() {
  console.log('🔍 Starting Performance Audit...\n');

  // 1. Lighthouse Audit
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    port: chrome.port
  };

  const runnerResult = await lighthouse('http://localhost:3000', options);
  const report = runnerResult.report;
  await chrome.kill();

  // Parse results
  const results = JSON.parse(report);
  console.log('📊 Lighthouse Results:');
  console.log(`- First Contentful Paint: ${results.audits['first-contentful-paint'].numericValue}ms`);
  console.log(`- Time to Interactive: ${results.audits['interactive'].numericValue}ms`);
  console.log(`- Performance Score: ${results.categories.performance.score * 100}/100`);

  // 2. WebSocket Latency Test
  console.log('\n🌐 WebSocket Latency Test:');
  const latencies = [];
  const ws = new WebSocket('ws://localhost:8080');

  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    await new Promise(resolve => {
      ws.send(JSON.stringify({ event: 'PING' }));
      ws.once('message', () => {
        latencies.push(Date.now() - start);
        resolve();
      });
    });
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  console.log(`- Average WebSocket Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`- 95th Percentile Latency: ${percentile(latencies, 95).toFixed(2)}ms`);

  // 3. Memory Usage Test
  console.log('\n💾 Memory Usage Test:');
  const memorySnapshot = execSync('node --expose-gc -e "gc(); process.memoryUsage().heapUsed"')
    .toString().trim();
  console.log(`- Heap Usage: ${(memorySnapshot / 1024 / 1024).toFixed(2)}MB`);

  // 4. Test Coverage
  console.log('\n🧪 Running Test Coverage...');
  execSync('npx vitest run --coverage', { stdio: 'inherit' });

  // Validate Results
  const hasPerformanceIssues = 
    results.audits['first-contentful-paint'].numericValue > 1500 || // 1.5s
    avgLatency > 200 || // 200ms
    results.categories.performance.score < 0.9; // 90%

  if (hasPerformanceIssues) {
    console.error('\n⚠️ Performance Issues Detected!');
    process.exit(1);
  }

  console.log('\n✅ Performance Audit Passed!');
}

function percentile(arr, p) {
  const sorted = arr.sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p / 100;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

runPerformanceAudit().catch(console.error); 