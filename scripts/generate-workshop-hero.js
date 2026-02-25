#!/usr/bin/env node
/**
 * OpenAI Image Generation Script — Workshop Landing Page Hero
 *
 * Generates a multicultural, diverse hero banner image for the
 * Vibe Coding for Production workshop landing page.
 *
 * Usage:
 *   node scripts/generate-workshop-hero.js
 *
 * Environment:
 *   OPENAI_API_KEY - Your OpenAI API key
 *
 * Output:
 *   courses/assets/hero-workshop-landing.png
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (value) process.env[key.trim()] = value;
    }
  });
  console.log('Loaded .env file');
}

const CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-image-1',
  outputDir: path.join(__dirname, '..', 'courses', 'assets'),
  outputFile: 'hero-workshop-landing.png',
  size: '1536x1024',
  quality: 'high',

  prompt: `Create a stunning, professional hero banner image for a live software engineering workshop called "Vibe Coding for Production" by AutoNateAI.

The image must prominently feature a DIVERSE, MULTICULTURAL group of software developers (5-7 people) working together in a modern, well-lit tech workspace. Include:
- A Black woman with natural hair focused on her laptop screen showing code
- An Asian man gesturing toward a large monitor with an architecture diagram
- A Latino developer pair-programming with a colleague
- A South Asian woman presenting at a whiteboard with system design notes
- A white man reviewing code on a secondary display
- Mixed genders, ages (20s-40s), professional but relaxed dress (hoodies, clean casual)

Environment details:
- Modern, airy co-working space with warm lighting and dark accent walls
- Multiple screens showing VS Code, terminal windows, Git diffs, and AI chat interfaces
- Whiteboard in the background with "M.A.P.P.E.R." written on it and a flowchart
- Subtle purple (#7986cb) and teal (#4db6ac) accent lighting or neon glow on surfaces
- Coffee cups, notebooks, stickers on laptops — lived-in but clean

Style:
- Photorealistic, editorial-quality photograph aesthetic
- Warm, inviting, energetic — people are engaged and collaborating
- Shallow depth of field on the edges, sharp focus on the center group
- Color grading: rich darks, warm highlights, subtle purple/teal color cast
- Premium, aspirational but authentic — NOT stock-photo stiff
- No visible text or logos in the image

The overall mood should say: "This is where serious engineers level up together."

Dimensions: 1536x1024 (will display as wide hero banner)`
};

async function main() {
  console.log('AutoNateAI Workshop Hero Image Generator\n');

  if (!CONFIG.apiKey) {
    console.error('Error: OPENAI_API_KEY not set.\n');
    console.log('Set it with:');
    console.log('  export OPENAI_API_KEY="your-key-here"\n');
    console.log('Or create scripts/.env with:');
    console.log('  OPENAI_API_KEY=your-key-here\n');
    process.exit(1);
  }

  console.log('API key found');
  console.log(`Output: ${path.join(CONFIG.outputDir, CONFIG.outputFile)}\n`);

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    console.log('Generating hero image... (30-60 seconds)\n');

    const imageUrl = await generateImage();
    if (imageUrl !== 'BASE64_SAVED') {
      console.log('Downloading...');
      await downloadImage(imageUrl, path.join(CONFIG.outputDir, CONFIG.outputFile));
    }

    console.log('\nDone! Hero image saved to:');
    console.log(`  courses/assets/${CONFIG.outputFile}\n`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function generateImage() {
  return new Promise((resolve, reject) => {
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
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) { reject(new Error(response.error.message)); return; }
          if (response.data && response.data[0]) {
            if (response.data[0].url) {
              resolve(response.data[0].url);
            } else if (response.data[0].b64_json) {
              const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
              fs.writeFileSync(outputPath, Buffer.from(response.data[0].b64_json, 'base64'));
              resolve('BASE64_SAVED');
            } else {
              reject(new Error('No image URL or base64 in response'));
            }
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => { reject(new Error(`Request failed: ${e.message}`)); });
    req.write(requestBody);
    req.end();
  });
}

async function downloadImage(url, outputPath) {
  if (url === 'BASE64_SAVED') return;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

main();
