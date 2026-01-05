#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) {
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (val) process.env[key.trim()] = val;
    }
  });
}

const CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-image-1',
  size: '1536x1024',
  quality: 'high',
  outputPath: path.join(__dirname, '..', 'courses', 'assets', 'og-catalog.png'),
  prompt: `Create a stunning social media preview image for a "Course Catalog" page on AutoNateAI learning platform.

Design specifications:
- Dark background: #0a0a0f (nearly black)
- Primary accent: #7986cb (soft purple)
- Secondary accents: #4db6ac (teal), #ffd54f (gold), #00bcd4 (cyan)

Visual elements:
- The text "Course Catalog" or "Explore Courses" prominently displayed
- Four glowing course icons arranged in a grid or row:
  - A golden STAR (representing beginners)
  - A GRADUATION CAP (representing students)  
  - A ROCKET (representing acceleration)
  - A LIGHTNING BOLT (representing power/senior)
- Abstract learning path or journey visualization connecting them
- Code symbols and circuit patterns subtly in background
- Floating books, certificates, or achievement badges

Style:
- Modern, sleek, professional
- Gallery/catalog aesthetic - showcasing multiple options
- Inviting "explore and choose" feeling
- Glowing/luminous effects

The image should convey: "Explore all our courses and find your perfect learning path"

Dimensions: 1200x630 pixels (social media preview)`
};

console.log('🎨 Generating Catalog OG Image...\n');

if (!CONFIG.apiKey) {
  console.error('❌ OPENAI_API_KEY not set');
  process.exit(1);
}

const requestBody = JSON.stringify({
  model: CONFIG.model,
  prompt: CONFIG.prompt,
  n: 1,
  size: CONFIG.size,
  quality: CONFIG.quality
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/images/generations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + CONFIG.apiKey,
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    if (response.error) {
      console.error('❌ Error:', response.error.message);
      return;
    }
    if (response.data && response.data[0].b64_json) {
      const buffer = Buffer.from(response.data[0].b64_json, 'base64');
      fs.writeFileSync(CONFIG.outputPath, buffer);
      console.log('✅ Saved: courses/assets/og-catalog.png');
    } else if (response.data && response.data[0].url) {
      console.log('✅ Generated! URL:', response.data[0].url);
      // Download
      https.get(response.data[0].url, (imgRes) => {
        const file = fs.createWriteStream(CONFIG.outputPath);
        imgRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('✅ Saved: courses/assets/og-catalog.png');
        });
      });
    }
  });
});

req.on('error', e => console.error('❌ Error:', e.message));
req.write(requestBody);
req.end();

