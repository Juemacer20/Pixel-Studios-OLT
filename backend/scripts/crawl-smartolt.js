// Crawler de SmartOLT: loguea y extrae OLTs, speed profiles, zonas y ONUs configuradas.
// Escribe backend/data/real-data.json (consumido por import-smartolt.js).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
// puppeteer puede no estar en backend/node_modules; usar el global del usuario como fallback.
let puppeteer; try { puppeteer = require('puppeteer'); } catch { puppeteer = require('/home/juan/node_modules/puppeteer'); }

const BASE = process.env.SMARTOLT_URL || 'https://itelsa.smartolt.com';
const USER = process.env.SMARTOLT_USER;
const PASS = process.env.SMARTOLT_PASS;
const OUT = path.join(__dirname, '..', 'data', 'real-data.json');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

(async () => {
  if (!USER || !PASS) { console.error('Faltan SMARTOLT_USER / SMARTOLT_PASS en .env'); process.exit(1); }
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');

  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.type('#identity', USER, { delay: 15 });
  await page.type('#password', PASS, { delay: 15 });
  await Promise.all([ page.click('input[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }) ]);
  if (page.url().includes('/auth/login')) { console.error('LOGIN FAIL'); await browser.close(); process.exit(2); }
  console.log('login OK');

  const out = { olts: [], speedProfiles: [], zones: [], onus: [] };
  const rows = (sel) => page.evaluate((s) => {
    const c = x => (x || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll(s)].map(tr => [...tr.querySelectorAll('td')].map(td => c(td.innerText)));
  }, sel);

  await page.goto(`${BASE}/olt`, { waitUntil: 'networkidle2', timeout: 45000 }); await new Promise(r => setTimeout(r, 1500));
  out.olts = (await rows('table tbody tr')).filter(r => r.length >= 8);
  console.log('OLTs:', out.olts.length);

  await page.goto(`${BASE}/speed_profiles`, { waitUntil: 'networkidle2', timeout: 45000 }); await new Promise(r => setTimeout(r, 1500));
  out.speedProfiles = (await rows('table tbody tr')).filter(r => r.length >= 4);
  console.log('SpeedProfiles:', out.speedProfiles.length);

  await page.goto(`${BASE}/locations/listing`, { waitUntil: 'networkidle2', timeout: 45000 }); await new Promise(r => setTimeout(r, 1500));
  out.zones = (await rows('table tbody tr')).filter(r => r[0]).map(r => ({ name: r[0], onus: r[1] }));
  console.log('Zones:', out.zones.length);

  for (const oltId of [4, 5, 6, 7, 8, 9]) {
    try {
      await page.goto(`${BASE}/onu/configured?olt_id=${oltId}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2500));
      const r = await page.evaluate((oltId) => {
        const c = x => (x || '').replace(/\s+/g, ' ').trim();
        return [...document.querySelectorAll('table tbody tr')].slice(0, 80)
          .map(tr => { const cells = [...tr.querySelectorAll('td')].map(td => c(td.innerText)); return cells.length >= 5 ? { oltId, cells } : null; })
          .filter(Boolean);
      }, oltId);
      out.onus.push(...r);
      console.log(`OLT ${oltId}:`, r.length);
    } catch (e) { console.log(`OLT ${oltId} err:`, e.message); }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Saved', OUT, '| ONUs:', out.onus.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
