#!/usr/bin/env node
// Validates that all data/*.json files parse correctly and contain expected top-level keys.

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const checks = [
  { file: 'matches.json', requiredKeys: ['matches'] },
  { file: 'teams.json', requiredKeys: ['teams'] },
  { file: 'venues.json', requiredKeys: [] }, // top-level array
];

let allPassed = true;

for (const { file, requiredKeys } of checks) {
  const filePath = path.join(dataDir, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error(`Missing required key: "${key}"`);
    }
    console.log(`✓ ${file}`);
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    allPassed = false;
  }
}

if (!allPassed) process.exit(1);
console.log('All data files valid.');
