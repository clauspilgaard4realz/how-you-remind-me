const apiKey = process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBxeQd-JUFKprjMMThORTBqzIBT_sBNr60';
const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`;
const res = await fetch(url);
const text = await res.text();
console.log('status', res.status);
console.log(JSON.stringify(JSON.parse(text), null, 2));
