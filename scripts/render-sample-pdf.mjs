import { createJiti } from 'jiti';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as React from 'react';
globalThis.React = React;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url, {
  alias: { '@': path.join(root, 'src') },
  interopDefault: true,
  jsx: { runtime: 'classic' },
  cache: false,
});

const { generatePredictionPdf } = await jiti.import(
  path.join(root, 'src/lib/services/prediction-pdf.tsx'),
);
const { allGroupMatches } = await jiti.import(path.join(root, 'src/data/matches.ts'));

// Fill every group match with a "home" pick and every knockout with "home" too,
// so the rendered PDF exercises all rows including a derived champion.
const groupMatches = {};
for (const m of allGroupMatches) groupMatches[m.id] = 'home';

const knockoutMatches = {};
const koIds = [
  // R32
  ...Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `QF-${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `SF-${i + 1}`),
  '3RD-1',
  'FIN-1',
];
for (const id of koIds) knockoutMatches[id] = 'home';

const buf = await generatePredictionPdf({
  predictionId: 'sample-id',
  predictionNumber: 42,
  name: 'Sample Predictor',
  submittedAt: new Date('2026-05-18T15:30:00Z').toISOString(),
  groupMatches,
  knockoutMatches,
  thirdPlaceTiebreaker: null,
  shareUrl: 'https://example.com/shared/sample-token',
});

const out = path.join(root, 'tmp-sample-prediction.pdf');
writeFileSync(out, buf);
console.log('wrote', out, 'bytes=', buf.length);
