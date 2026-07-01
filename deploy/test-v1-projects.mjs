const apiKey = 'AIzaSyBxeQd-JUFKprjMMThORTBqzIBT_sBNr60';
const url = `https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`;
const headers = {
  'Content-Type': 'application/json',
  'X-Client-Version': 'Chrome/JsCore/11.6.0/FirebaseCore-web',
  'X-Firebase-gmpid': '1:629531664109:web:f2dedcbf31b600458976e4',
  Referer: 'https://juice-da-car.web.app/login',
  Origin: 'https://juice-da-car.web.app',
};

const res = await fetch(url, { headers, referrerPolicy: 'no-referrer' });
const text = await res.text();
console.log('status', res.status);
console.log(text.slice(0, 400));
