import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const shared = JSON.parse(await readFile('src/data/archive/shared.json', 'utf8'));
const snapshot = JSON.parse(await readFile('src/data/archive/snapshot.json', 'utf8'));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
}
const output = await files('out');
assert.ok(output.includes('out/index.html'));
assert.ok(output.includes('out/404.html'));
assert.ok(output.includes('out/manifest.webmanifest'));
for (const { token } of shared) {
  const html = await readFile(`out/shared/${token}/index.html`, 'utf8');
  assert.ok(html.includes('Archived prediction'));
  // Each public page must not expose other share tokens.
  for (const other of shared) if (other.token !== token) assert.ok(!html.includes(other.token));
}
for (const match of snapshot.matches) for (const flag of [match.homeFlag, match.awayFlag]) assert.ok((await stat(`out${flag}`)).isFile());
for (const path of output.filter(p => /\.(js|html|css)$/.test(p))) {
  const content = await readFile(path, 'utf8');
  assert.ok(!/["'`]\/api\/(?:auth|admin|football|predictions|leaderboard|news|validate-email)/.test(content), `Runtime API dependency in ${path}`);
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|ADMIN_SECRET|submitter_email|pdf_path/.test(content), `Private field or secret reference in ${path}`);
  for (const match of content.matchAll(/(?:src|href)="(\/(?!\/)[^"#?]*)[^"#]*"/g)) {
    const target = match[1];
    if (target === '/') continue;
    const asset = resolve('out', '.' + decodeURIComponent(target));
    assert.ok((await stat(asset)).isFile() || (await stat(asset)).isDirectory(), `Missing asset ${target}`);
  }
}
console.log(`Static export verified: ${shared.length} shared pages, ${snapshot.matches.length} results, local assets, no runtime API references or private fields.`);
