/** Vendor the original fonts and team flags once; normal builds need no network. */
import { mkdir, writeFile } from 'node:fs/promises';
import { teams } from '../../src/data/teams';
import snapshot from '../../src/data/archive/snapshot.json';

async function download(url: string, path: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}
async function font(cssUrl: string, name: string) {
  const response = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error('Font stylesheet failed');
  const css = await response.text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`Font URL missing: ${name}`);
  await download(url, `src/fonts/${name}.ttf`);
}
async function main() {
  await mkdir('public/images/flags', { recursive: true });
  const codes = new Set([...teams.map(t => t.code), ...snapshot.matches.flatMap(m => [m.homeCode, m.awayCode])].filter((c): c is string => !!c && /^[A-Z]{2}(?:-[A-Z]{3})?$/.test(c)));
  for (const code of codes) await download(`https://flagcdn.com/w320/${code.toLowerCase()}.png`, `public/images/flags/${code.toLowerCase()}.png`);
  await font('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400..700&display=swap', 'NotoSans');
  await mkdir('public/fonts', { recursive: true });
  const iconCss = await (await fetch('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
  })).text();
  const iconUrl = iconCss.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!iconUrl) throw new Error('Variable icon font missing');
  await download(iconUrl, 'public/fonts/material-symbols-outlined.woff2');
  console.log(`Vendored ${codes.size} flags and both font families.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
