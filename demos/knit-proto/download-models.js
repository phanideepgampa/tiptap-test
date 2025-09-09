#!/usr/bin/env node
// Script to download transformer models locally to avoid CORS issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const MODEL_FILES = [
  'config.json',
  'tokenizer_config.json', 
  'tokenizer.json',
  'onnx/model_quantized.onnx',
  // Essential files for transformers.js ONNX models
  'model.json',
  'onnx/model.json'
];

const BASE_URL = 'https://huggingface.co';
const MODEL_DIR = path.join(__dirname, 'public', 'models', MODEL_NAME);

async function downloadFile(url, destPath, depth = 0) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const headers = {};
    if (destPath.endsWith('.json')) headers['Accept'] = 'application/json';
    const reqUrl = new URL(url);
    const options = {
      protocol: reqUrl.protocol,
      hostname: reqUrl.hostname,
      port: reqUrl.port,
      path: reqUrl.pathname + reqUrl.search,
      headers,
    };

    const file = fs.createWriteStream(destPath);
    https.get(options, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        if (depth > 10) return reject(new Error('Too many redirects'));
        const next = response.headers.location.startsWith('http')
          ? response.headers.location
          : `${BASE_URL}${response.headers.location}`;
        return downloadFile(next, destPath, depth + 1).then(resolve).catch(reject);
      }
      if (status !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${status} for ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log(`📦 Downloading model: ${MODEL_NAME}`);
  console.log(`📁 Destination: ${MODEL_DIR}\n`);

  for (const file of MODEL_FILES) {
    const url = `${BASE_URL}/${MODEL_NAME}/resolve/main/${file}`;
    const destPath = path.join(MODEL_DIR, file);
    
    console.log(`⬇️  Downloading ${file}...`);
    try {
      await downloadFile(url, destPath);
      console.log(`✅ Downloaded ${file}`);
    } catch (error) {
      console.error(`❌ Failed to download ${file}:`, error.message);
    }
  }

  console.log('\n✨ Model download complete!');
}

downloadModels().catch(console.error);
