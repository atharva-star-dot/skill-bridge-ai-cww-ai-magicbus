import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) { console.error('.env.local not found'); process.exit(1); }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();
const apiKey = process.env.GEMINI_API_KEY!;

async function probe(modelName: string): Promise<boolean> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply: {"ok":true}' }] }], generationConfig: { responseMimeType: 'application/json' } }) });
  const json = await res.json() as any;
  if (res.ok) { console.log(`  ✅  ${modelName}`); return true; }
  console.log(`  ❌  ${modelName} → ${json?.error?.message?.slice(0,100)}`);
  return false;
}

(async () => {
  const candidates = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
  const working: string[] = [];
  for (const m of candidates) { const ok = await probe(m); if (ok) working.push(m); }
  console.log('\nWorking:', working);
})();
