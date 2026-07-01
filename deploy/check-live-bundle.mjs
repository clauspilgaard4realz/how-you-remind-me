import { readFileSync } from 'node:fs';

const res = await fetch('https://juice-da-car.web.app/assets/index-Csv7XYTR.js');
const s = await res.text();
const m = s.match(/apiKey:"([^"]+)",authDomain:"([^"]+)",projectId:"([^"]+)"/);
const appId = s.match(/appId:"([^"]+)"/) ?? s.match(/1:629531664109:web:[^"]+/);
console.log('live bundle:', m);
console.log('appId match:', appId?.[0]?.slice(0, 50));
