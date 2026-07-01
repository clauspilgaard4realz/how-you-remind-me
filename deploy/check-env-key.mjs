import { readFileSync } from 'node:fs';

const line = readFileSync('frontend/.env.production', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('VITE_FIREBASE_API_KEY='));
const val = line?.slice('VITE_FIREBASE_API_KEY='.length).trim() ?? '';
const segment = val.slice(val.indexOf('UFKp'), val.indexOf('UFKp') + 8);
console.log('env key length:', val.length);
console.log('has prjMM:', val.includes('prjMM'));
console.log('segment codes:', [...segment].map((c) => c.charCodeAt(0)));
