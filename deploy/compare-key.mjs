import { readFileSync } from 'node:fs';

const s = readFileSync('frontend/dist/assets/index-Csv7XYTR.js', 'utf8');
const idx = s.indexOf('juice-da-car.firebaseapp.com');
console.log('firebase config context:', s.slice(idx - 80, idx + 60));

const all = [...s.matchAll(/apiKey:"([^"]+)"/g)];
console.log('apiKey matches:', all.length);
for (const m of all) {
  console.log(' len', m[1].length, 'ends', m[1].slice(-6));
}
