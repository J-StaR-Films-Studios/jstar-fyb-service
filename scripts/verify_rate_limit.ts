
// This script verifies that rate limiting is active on the server.
// It sends requests to /api/auth/csrf until the limit is reached.

const BASE_URL = 'http://localhost:3000';
const ENDPOINT = '/api/auth/csrf';

async function main() {
  console.log(`Testing rate limit on ${BASE_URL}${ENDPOINT}...`);
  console.log('Sending requests...');

  const limit = 20; // Expected limit for /api/auth/*
  let successCount = 0;
  let blockedCount = 0;
  const maxRequests = limit + 10;

  for (let i = 0; i < maxRequests; i++) {
    try {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}${ENDPOINT}`);
      const duration = Date.now() - start;

      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = res.headers.get('x-ratelimit-reset');

      console.log(`Request ${i + 1}: Status ${res.status} | Remaining: ${remaining} | Reset: ${reset} | Time: ${duration}ms`);

      if (res.status === 429) {
        blockedCount++;
        // Verify JSON response
        const json = await res.json();
        if (json.error !== 'Too many requests') {
            console.error('Error: Unexpected response body for 429:', json);
        }
      } else if (res.status === 200 || res.status === 404 || res.status === 401) {
        successCount++;
      } else {
        console.warn(`Unexpected status: ${res.status}`);
      }

    } catch (err: any) {
      console.error(`Request ${i + 1} failed:`, err.message);
      if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
        console.error('\nERROR: Server is not running. Please start it with `npm run dev` in another terminal.');
        process.exit(1);
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`Successful requests: ${successCount}`);
  console.log(`Blocked requests: ${blockedCount}`);

  if (blockedCount > 0) {
    console.log('SUCCESS: Rate limiting is active and blocking excess requests.');
    process.exit(0);
  } else {
    console.error('FAILURE: Rate limit was not triggered.');
    console.log('Ensure middleware is active and limits are correctly configured.');
    process.exit(1);
  }
}

main().catch(console.error);
