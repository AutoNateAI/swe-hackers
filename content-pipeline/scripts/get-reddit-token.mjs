#!/usr/bin/env node
/**
 * One-time script to get a Reddit refresh token for snoowrap.
 *
 * Usage:
 *   1. Make sure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are in .env
 *   2. Run: node scripts/get-reddit-token.mjs
 *   3. Open the URL it prints in your browser
 *   4. Authorize the app, copy the code from the redirect URL
 *   5. Paste the code when prompted
 *   6. Copy the refresh token into your .env
 */
import Snoowrap from 'snoowrap';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  let val = trimmed.slice(eqIdx + 1);
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const clientId = process.env.REDDIT_CLIENT_ID;
const clientSecret = process.env.REDDIT_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Error: REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const redirectUri = 'http://localhost:8080';
const authUrl = Snoowrap.getAuthUrl({
  clientId,
  scope: ['read', 'identity', 'history'],
  redirectUri,
  permanent: true,
  state: 'autonateai',
});

console.log('\n=== Reddit OAuth Token Generator ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl}\n`);
console.log('2. Click "Allow" to authorize the app');
console.log('3. You\'ll be redirected to localhost:8080 (it will fail to load, that\'s fine)');
console.log('4. Copy the "code" parameter from the URL bar');
console.log('   Example: http://localhost:8080?state=autonateai&code=XXXXXX\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  rl.close();

  try {
    const client = await Snoowrap.fromAuthCode({
      code: code.trim(),
      userAgent: process.env.REDDIT_USER_AGENT || 'autonateai-scraper/1.0',
      clientId,
      clientSecret,
      redirectUri,
    });

    const refreshToken = client.refreshToken;
    console.log('\n=== Success! ===\n');
    console.log(`Refresh Token: ${refreshToken}\n`);
    console.log('Add this to your .env file:');
    console.log(`REDDIT_REFRESH_TOKEN=${refreshToken}\n`);

    // Verify it works
    const me = await client.getMe();
    console.log(`Authenticated as: /u/${me.name}`);
  } catch (err) {
    console.error('Error getting token:', err.message);
    process.exit(1);
  }
});
