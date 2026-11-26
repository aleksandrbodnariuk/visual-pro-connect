// Run after `npx cap add android` / before each release: node native/android/patch-android.mjs
// Idempotently adds required permissions so native setup never gets lost between exports.
import fs from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let s = fs.readFileSync(f, 'utf8');
const perms = ['INTERNET','POST_NOTIFICATIONS','RECORD_AUDIO','MODIFY_AUDIO_SETTINGS','CAMERA'];
for (const p of perms) {
  const tag = `<uses-permission android:name="android.permission.${p}" />`;
  if (!s.includes(`android.permission.${p}"`)) s = s.replace('</manifest>', `    ${tag}\n</manifest>`);
}
fs.writeFileSync(f, s);
if (!fs.existsSync('android/app/google-services.json')) {
  console.warn('!! Copy google-services.json from Firebase Console into android/app/');
}
console.log('Android manifest patched');
