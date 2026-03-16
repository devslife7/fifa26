import { teamsByCode, groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { generateBracket } from '@/lib/bracket';
import type { MatchResult, KnockoutResult, KnockoutRound, GroupLetter } from '@/types';

// Short names for compact email rendering
const SHORT: Record<string, string> = {
  'United States': 'USA',
  'South Africa': 'S. Africa',
  'South Korea': 'S. Korea',
  'New Zealand': 'N. Zealand',
  'Saudi Arabia': 'S. Arabia',
  'Switzerland': 'Switz.',
  'SCE/DEN/IRL/MKD': 'TBD',
  'BIH/ITA/NIR/WAL': 'TBD',
  'KOS/ROU/SVK/TUR': 'TBD',
  'ALB/POL/SWE/UKR': 'TBD',
  'BOL/IRQ/SUR': 'TBD',
  'COD/JAM/NCL': 'TBD',
};

/** Short team name for email display */
export function tn(code?: string): string {
  if (!code || code.startsWith('TBD')) return 'TBD';
  const t = teamsByCode[code];
  if (!t) return code;
  return SHORT[t.name] || t.name;
}

/** Team flag emoji */
export function tf(code?: string): string {
  if (!code || code.startsWith('TBD')) return '';
  return teamsByCode[code]?.flag ?? '';
}

/** Resolve team code to name + flag */
export function resolveTeam(code: string): { name: string; flag: string } {
  const team = teamsByCode[code];
  return team ? { name: team.name, flag: team.flag } : { name: code, flag: '🏳️' };
}

// ── Group Stage HTML ──────────────────────────────────────────

function matchRowHtml(homeCode: string, awayCode: string, result?: MatchResult): string {
  const hw = result === 'home';
  const aw = result === 'away';
  const dr = result === 'draw';

  const W = '#1a1a1a';
  const D = 'rgba(0,0,0,0.5)';
  const L = 'rgba(0,0,0,0.3)';

  const hColor = hw ? W : dr ? D : L;
  const aColor = aw ? W : dr ? D : L;
  const hW = hw ? '700' : '400';
  const aW = aw ? '700' : '400';

  const homeLabel = tf(homeCode) ? `${tn(homeCode)}&nbsp;${tf(homeCode)}` : tn(homeCode);
  const awayLabel = tf(awayCode) ? `${tf(awayCode)}&nbsp;${tn(awayCode)}` : tn(awayCode);
  const vsText = dr ? 'TIE' : 'vs';
  const vsColor = dr ? D : 'rgba(0,0,0,0.2)';
  const vsW = dr ? '700' : '400';

  return `<tr>
<td align="right" style="padding:2px 0;font-size:11px;font-weight:${hW};color:${hColor};white-space:nowrap;">${homeLabel}</td>
<td align="center" style="padding:2px 4px;font-size:8px;color:${vsColor};font-weight:${vsW};width:24px;">${vsText}</td>
<td align="left" style="padding:2px 0;font-size:11px;font-weight:${aW};color:${aColor};white-space:nowrap;">${awayLabel}</td>
</tr>`;
}

function groupCardHtml(group: GroupLetter, predictions: Record<string, MatchResult>): string {
  const matches = allGroupMatches.filter(m => m.group === group);
  const rows = matches.map(m => matchRowHtml(m.home, m.away, predictions[m.id])).join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f5;border-radius:6px;overflow:hidden;">
<tr><td style="padding:4px 8px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.1em;border-bottom:1px solid rgba(0,0,0,0.08);">GROUP&nbsp;${group}</td></tr>
<tr><td style="padding:3px 6px;">
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr>
</table>`;
}

export function buildGroupMatchesHtml(predictions: Record<string, MatchResult>): string {
  let html = `<tr><td style="padding:20px 32px 8px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:rgba(0,0,0,0.35);font-weight:700;">Group Stage &mdash; 72 Matches</div>
</td></tr>`;

  for (let i = 0; i < groups.length; i += 2) {
    const g1 = groups[i];
    const g2 = groups[i + 1];
    html += `<tr><td style="padding:3px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="49%" valign="top">${groupCardHtml(g1, predictions)}</td>
<td width="2%"></td>
<td width="49%" valign="top">${groupCardHtml(g2, predictions)}</td>
</tr></table>
</td></tr>`;
  }

  return html;
}

// ── Knockout Bracket HTML ─────────────────────────────────────

function koMatchHtml(
  homeCode: string | undefined,
  awayCode: string | undefined,
  result: KnockoutResult | undefined,
  variant: 'normal' | 'bronze' | 'gold',
): string {
  const isHome = result === 'home';
  const isAway = result === 'away';

  const winBg = variant === 'gold'
    ? 'rgba(212,160,23,0.15)'
    : variant === 'bronze'
      ? 'rgba(205,127,50,0.1)'
      : 'rgba(34,197,94,0.08)';
  const winColor = variant === 'gold' ? '#b8860b' : '#1a1a1a';
  const loseColor = 'rgba(0,0,0,0.3)';
  const border = variant === 'gold'
    ? 'rgba(212,160,23,0.3)'
    : variant === 'bronze'
      ? 'rgba(205,127,50,0.2)'
      : 'rgba(0,0,0,0.1)';
  const fs = variant === 'gold' ? '13px' : '11px';
  const pad = variant === 'gold' ? '5px 10px' : '3px 8px';

  const homeLabel = tf(homeCode)
    ? `${tf(homeCode)}&nbsp;${tn(homeCode)}`
    : homeCode ? tn(homeCode) : 'TBD';
  const awayLabel = tf(awayCode)
    ? `${tf(awayCode)}&nbsp;${tn(awayCode)}`
    : awayCode ? tn(awayCode) : 'TBD';

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;border:1px solid ${border};margin-bottom:4px;">
<tr><td style="padding:${pad};font-size:${fs};background:${isHome ? winBg : 'transparent'};font-weight:${isHome ? '700' : '400'};color:${isHome ? winColor : loseColor};border-bottom:1px solid rgba(0,0,0,0.06);">${homeLabel}</td></tr>
<tr><td style="padding:${pad};font-size:${fs};background:${isAway ? winBg : 'transparent'};font-weight:${isAway ? '700' : '400'};color:${isAway ? winColor : loseColor};">${awayLabel}</td></tr>
</table>`;
}

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  FIN: 'Final',
};

export function buildKnockoutHtml(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[],
): string {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const roundOrder: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];

  let html = `<tr><td style="padding:24px 32px 8px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:rgba(0,0,0,0.35);font-weight:700;">Knockout Bracket &mdash; 31 Matches</div>
</td></tr>`;

  for (const round of roundOrder) {
    const matches = bracket.filter(m => m.round === round);
    if (matches.length === 0) continue;

    const variant = round === 'FIN' ? 'gold' : round === '3RD' ? 'bronze' : 'normal';
    const labelColor = round === 'FIN' ? '#b8860b' : 'rgba(0,0,0,0.4)';

    // Round header
    html += `<tr><td style="padding:12px 32px 4px;">
<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:${labelColor};font-weight:700;">${ROUND_LABELS[round]} &mdash; ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}</div>
</td></tr>`;

    if (matches.length > 2) {
      // 2-column layout for R32 / R16 / QF
      const half = Math.ceil(matches.length / 2);
      const left = matches.slice(0, half);
      const right = matches.slice(half);
      html += `<tr><td style="padding:0 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="49%" valign="top">${left.map(m => koMatchHtml(m.home, m.away, m.result, variant)).join('')}</td>
<td width="2%"></td>
<td width="49%" valign="top">${right.map(m => koMatchHtml(m.home, m.away, m.result, variant)).join('')}</td>
</tr></table>
</td></tr>`;
    } else if (matches.length === 2) {
      // Side by side for SF
      html += `<tr><td style="padding:0 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="49%" valign="top">${koMatchHtml(matches[0].home, matches[0].away, matches[0].result, variant)}</td>
<td width="2%"></td>
<td width="49%" valign="top">${koMatchHtml(matches[1].home, matches[1].away, matches[1].result, variant)}</td>
</tr></table>
</td></tr>`;
    } else {
      // Single match (3RD, FIN) — left-aligned at half width
      html += `<tr><td style="padding:0 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="49%">${koMatchHtml(matches[0].home, matches[0].away, matches[0].result, variant)}</td>
<td width="51%"></td>
</tr></table>
</td></tr>`;
    }
  }

  return html;
}
