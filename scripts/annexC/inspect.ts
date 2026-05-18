// Quick inspector to dump specific pages of the FIFA PDF for human review.
// Usage: npx tsx scripts/annexC/inspect.ts <startPage> <endPage>
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

const pdfPath = path.join(__dirname, 'source.pdf');
const start = Number(process.argv[2] ?? '21');
const end = Number(process.argv[3] ?? '24');

async function main() {
  const data = fs.readFileSync(pdfPath);
  const p = new PDFParse({ data });
  const r = await p.getText();
  const pages: any[] = r.pages;
  for (let i = start; i <= end && i <= pages.length; i++) {
    console.log(`\n========== PAGE ${i} ==========`);
    const page = pages[i - 1];
    console.log(typeof page === 'string' ? page : (page.text ?? JSON.stringify(page).slice(0, 4000)));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
