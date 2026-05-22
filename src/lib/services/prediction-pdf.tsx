import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { allGroupMatches } from '@/data/matches';
import { teamsByCode } from '@/data/teams';
import { generateBracket, getMatchWinner } from '@/lib/logic/bracket';
import { GROUP_POINTS, QUALIFIER_POINTS, WINNER_POINTS } from '@/lib/logic/scoring';
import type { KnockoutResult, MatchResult } from '@/types';

interface GeneratePredictionPdfParams {
  predictionId: string;
  predictionNumber?: number | null;
  name: string;
  submittedAt?: string | null;
  groupMatches: Record<string, MatchResult>;
  knockoutMatches: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[] | null;
  shareUrl: string;
}

const roundLabels: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  '3RD': 'Third Place',
  FIN: 'Final',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 36,
    paddingHorizontal: 22,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  identity: {
    alignItems: 'flex-end',
  },
  identityName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  identityMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginTop: 0,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: -2,
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #d1d5db',
    backgroundColor: '#f3f4f6',
    minHeight: 22,
  },
  totalLabel: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRight: '1px solid #e5e7eb',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
  totalValue: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#111827',
    textAlign: 'center',
  },
  grandTotalRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #d1d5db',
    backgroundColor: '#f3f4f6',
    marginTop: 8,
    minHeight: 26,
  },
  grandTotalLabel: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#111827',
    textAlign: 'right',
    borderRight: '1px solid #e5e7eb',
  },
  grandTotalValue: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  groupColumns: {
    flexDirection: 'row',
    gap: 6,
  },
  groupColumn: {
    flex: 1,
  },
  table: {
    border: '1px solid #e5e7eb',
    borderBottom: 0,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    minHeight: 16,
  },
  tableHeaderRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRight: '1px solid #e5e7eb',
  },
  lastCell: {
    borderRight: 0,
  },
  headerCell: {
    fontSize: 7,
    color: '#374151',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  checkboxCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 11,
    height: 11,
    border: '1px solid #6b7280',
    borderRadius: 2,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamCellText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  teamCellPts: {
    color: '#6b7280',
    fontSize: 8,
  },
  footer: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: 7,
  },
});

function teamName(code: string | undefined | null): string {
  if (!code) return 'TBD';
  const team = teamsByCode[code];
  return team ? `${team.name} (${team.code})` : code;
}

function groupPickCode(matchId: string, result: MatchResult | undefined): string {
  const match = allGroupMatches.find((m) => m.id === matchId);
  if (!match || !result) return '—';
  if (result === 'draw') return 'Draw';
  const code = result === 'home' ? match.home : match.away;
  return code ?? '—';
}

function knockoutPickCode(home: string | undefined, away: string | undefined, result: KnockoutResult | undefined): string {
  if (!result) return '—';
  const code = result === 'home' ? home : away;
  return code ?? '—';
}

function submittedDate(value: string | null | undefined): string {
  if (!value) return new Date().toLocaleString('en-US');
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PredictionPdfDocument({
  predictionNumber,
  name,
  submittedAt,
  groupMatches,
  knockoutMatches,
  thirdPlaceTiebreaker,
  shareUrl,
}: GeneratePredictionPdfParams) {
  const bracket = generateBracket(groupMatches, knockoutMatches, thirdPlaceTiebreaker ?? undefined);
  const orderedKnockout = bracket.sort((a, b) => {
    const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
    const roundDiff = roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
    return roundDiff || a.position - b.position;
  });

  const finalMatch = orderedKnockout.find((m) => m.id === 'FIN-1');
  const thirdMatch = orderedKnockout.find((m) => m.id === '3RD-1');
  const championCode = finalMatch ? getMatchWinner(finalMatch) : undefined;
  const thirdWinnerCode = thirdMatch ? getMatchWinner(thirdMatch) : undefined;

  // Each knockout match row contributes both its home and away teams to that
  // round's qualifier set, so a fully-correct row earns 2 × round points.
  const knockoutMaxPoints = orderedKnockout.reduce(
    (sum, m) => sum + 2 * (QUALIFIER_POINTS[m.round] ?? 0),
    0,
  );
  const groupMaxPoints = allGroupMatches.length * GROUP_POINTS;
  const knockoutSectionMax = knockoutMaxPoints + WINNER_POINTS['3RD'] + WINNER_POINTS.FIN;
  const grandTotalMax = groupMaxPoints + knockoutSectionMax;

  const metaPrefix = predictionNumber ? `Snapshot #${predictionNumber} · ` : '';

  return (
    <Document
      title={`FIFA 26 Prediction ${predictionNumber ? `#${predictionNumber}` : ''}`}
      author="FIFA 26 Predictions"
      subject="Submitted prediction snapshot"
    >
      <Page size="A4" style={styles.page}>
        <View wrap={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>FIFA 26 Predictions</Text>
          <View style={styles.identity}>
            <Text style={styles.identityName}>{name}</Text>
            <Text style={styles.identityMeta}>
              {metaPrefix}{submittedDate(submittedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Stage Picks</Text>
          <Text style={styles.sectionSubtitle}>
            +{GROUP_POINTS} point per correct match result. Maximum {groupMaxPoints} points across all group matches.
          </Text>
          <View style={styles.groupColumns}>
            {[0, 1].map((colIdx) => {
              const half = Math.ceil(allGroupMatches.length / 2);
              const slice = allGroupMatches.slice(colIdx * half, (colIdx + 1) * half);
              return (
                <View key={colIdx} style={[styles.groupColumn, styles.table]}>
                  <View style={[styles.row, styles.tableHeaderRow]} wrap={false}>
                    <Text style={[styles.cell, styles.headerCell, { width: '9%' }]}>Match</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '34%' }]}>Home</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '34%' }]}>Away</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '15%' }]}>Pick</Text>
                    <Text style={[styles.cell, styles.headerCell, styles.lastCell, styles.checkboxCell, { width: '8%' }]}>✓</Text>
                  </View>
                  {slice.map((match) => (
                    <View key={match.id} style={styles.row} wrap={false}>
                      <Text style={[styles.cell, { width: '9%' }]}>{match.id}</Text>
                      <Text style={[styles.cell, { width: '34%' }]}>{teamName(match.home)}</Text>
                      <Text style={[styles.cell, { width: '34%' }]}>{teamName(match.away)}</Text>
                      <Text style={[styles.cell, { width: '15%' }]}>{groupPickCode(match.id, groupMatches[match.id])}</Text>
                      <View style={[styles.cell, styles.lastCell, styles.checkboxCell, { width: '8%' }]}>
                        <View style={styles.checkbox} />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
          <View style={[styles.totalRow, { marginTop: 4 }]} wrap={false}>
            <Text style={[styles.totalLabel, { width: '85%' }]}>GROUP PICKS TOTAL</Text>
            <Text style={[styles.totalValue, { width: '15%' }]}>_____ / {groupMaxPoints}</Text>
          </View>
        </View>
        </View>

      </Page>
      <Page size="A4" style={styles.page}>
        <View wrap={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knockout Picks</Text>
          <Text style={styles.sectionSubtitle}>
            Scoring is per team, not per match. Tick each team in a row that actually qualifies for that round — each tick is worth that round&apos;s points (R32 +{QUALIFIER_POINTS.R32}, R16 +{QUALIFIER_POINTS.R16}, QF +{QUALIFIER_POINTS.QF}, SF +{QUALIFIER_POINTS.SF}, 3RD +{QUALIFIER_POINTS['3RD']}, FIN +{QUALIFIER_POINTS.FIN}). The 3rd-place match adds +{WINNER_POINTS['3RD']} and the Final adds +{WINNER_POINTS.FIN} when you pick the actual winner.
          </Text>

          <View style={styles.table}>
            <View style={[styles.row, styles.tableHeaderRow]} wrap={false}>
              <Text style={[styles.cell, styles.headerCell, { width: '8%' }]}>Match</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '12%' }]}>Round</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '33%' }]}>Home</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '33%' }]}>Away</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '8%' }]}>Pick</Text>
              <Text style={[styles.cell, styles.headerCell, styles.lastCell, { width: '6%' }]}>Row max</Text>
            </View>
            {orderedKnockout.map((match) => (
              <View key={match.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '8%' }]}>{match.id}</Text>
                <Text style={[styles.cell, { width: '12%' }]}>{roundLabels[match.round]}</Text>
                <View style={[styles.cell, styles.teamCell, { width: '33%' }]}>
                  <Text style={styles.teamCellText}>{teamName(match.home)}</Text>
                  <Text style={styles.teamCellPts}>+{QUALIFIER_POINTS[match.round] ?? 0}</Text>
                  <View style={styles.checkbox} />
                </View>
                <View style={[styles.cell, styles.teamCell, { width: '33%' }]}>
                  <Text style={styles.teamCellText}>{teamName(match.away)}</Text>
                  <Text style={styles.teamCellPts}>+{QUALIFIER_POINTS[match.round] ?? 0}</Text>
                  <View style={styles.checkbox} />
                </View>
                <Text style={[styles.cell, { width: '8%' }]}>
                  {knockoutPickCode(match.home, match.away, match.result)}
                </Text>
                <Text style={[styles.cell, styles.lastCell, { width: '6%' }]}>
                  +{2 * (QUALIFIER_POINTS[match.round] ?? 0)}
                </Text>
              </View>
            ))}
            <View style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: '20%', fontFamily: 'Helvetica-Bold' }]}>3rd-place winner</Text>
              <Text style={[styles.cell, { width: '58%' }]}>{teamName(thirdWinnerCode)}</Text>
              <Text style={[styles.cell, { width: '8%' }]}>{thirdWinnerCode ?? '—'}</Text>
              <Text style={[styles.cell, { width: '6%' }]}>+{WINNER_POINTS['3RD']}</Text>
              <View style={[styles.cell, styles.lastCell, styles.checkboxCell, { width: '8%' }]}>
                <View style={styles.checkbox} />
              </View>
            </View>
            <View style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: '20%', fontFamily: 'Helvetica-Bold' }]}>Final winner</Text>
              <Text style={[styles.cell, { width: '58%' }]}>{teamName(championCode)}</Text>
              <Text style={[styles.cell, { width: '8%' }]}>{championCode ?? '—'}</Text>
              <Text style={[styles.cell, { width: '6%' }]}>+{WINNER_POINTS.FIN}</Text>
              <View style={[styles.cell, styles.lastCell, styles.checkboxCell, { width: '8%' }]}>
                <View style={styles.checkbox} />
              </View>
            </View>
            <View style={styles.totalRow} wrap={false}>
              <Text style={[styles.totalLabel, { width: '70%' }]}>Knockout Picks Total</Text>
              <Text style={[styles.totalValue, { width: '30%' }]}>_____ / {knockoutSectionMax}</Text>
            </View>
          </View>

          <View style={styles.grandTotalRow} wrap={false}>
            <Text style={[styles.grandTotalLabel, { width: '70%' }]}>
              GRAND TOTAL (group + knockout)
            </Text>
            <Text style={[styles.grandTotalValue, { width: '30%' }]}>
              _____ / {grandTotalMax}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This PDF is a submitted prediction snapshot. Share link: {shareUrl}
        </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generatePredictionPdf(params: GeneratePredictionPdfParams): Promise<Buffer> {
  return renderToBuffer(<PredictionPdfDocument {...params} />);
}
