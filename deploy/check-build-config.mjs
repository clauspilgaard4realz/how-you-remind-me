import { readFileSync } from 'node:fs';

const s = readFileSync('frontend/dist/assets/index-BI_siBuk.js', 'utf8');
const idx = s.indexOf('juice-da-car.firebaseapp.com');
console.log('context:', s.slice(Math.max(0, idx - 120), idx + 80));

const undefinedKey = s.includes('apiKey:void 0') || s.includes('apiKey:""');
console.log('undefined/empty apiKey in bundle:', undefinedKey);

// Count firebase config objects
const matches = [...s.matchAll(/apiKey:"([^"]*)"/g)];
console.log('apiKey occurrences:', matches.length);
for (const m of matches.slice(0, 5)) {
  console.log(' -', m[1].slice(0, 12) + '...', 'len=', m[1].length);
}
