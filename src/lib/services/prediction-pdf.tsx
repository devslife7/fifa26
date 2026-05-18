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
import { generateBracket } from '@/lib/logic/bracket';
import { CHAMPION_POINTS, GROUP_POINTS, KNOCKOUT_POINTS } from '@/lib/logic/scoring';
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
    paddingTop: 18,
    paddingBottom: 18,
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
  bonusRow: {
    flexDirection: 'row',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    backgroundColor: '#fef3c7',
    marginBottom: 6,
    minHeight: 22,
    alignItems: 'stretch',
  },
  bonusLabel: {
    width: '28%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRight: '1px solid #d1d5db',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#92400e',
  },
  bonusPick: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRight: '1px solid #d1d5db',
    fontSize: 9,
  },
  bonusCheckCell: {
    width: '12%',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 18,
  },
  tableHeaderRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    paddingVertical: 3,
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

  const finalMatch = orderedKnockout.find((m) => m.round === 'FIN');
  const championCode = finalMatch?.result
    ? finalMatch.result === 'home'
      ? finalMatch.home
      : finalMatch.away
    : undefined;

  const knockoutMaxPoints = orderedKnockout.reduce(
    (sum, m) => sum + (KNOCKOUT_POINTS[m.round] ?? 0),
    0,
  );

  const metaPrefix = predictionNumber ? `Snapshot #${predictionNumber} · ` : '';

  return (
    <Document
      title={`FIFA 26 Prediction ${predictionNumber ? `#${predictionNumber}` : ''}`}
      author="FIFA 26 Predictions"
      subject="Submitted prediction snapshot"
    >
      <Page size="A4" style={styles.page}>
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
          <View style={styles.groupColumns}>
            {[0, 1].map((colIdx) => {
              const half = Math.ceil(allGroupMatches.length / 2);
              const slice = allGroupMatches.slice(colIdx * half, (colIdx + 1) * half);
              return (
                <View key={colIdx} style={[styles.groupColumn, styles.table]}>
                  <View style={[styles.row, styles.tableHeaderRow]} wrap={false}>
                    <Text style={[styles.cell, styles.headerCell, { width: '9%' }]}>Match</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '28%' }]}>Home</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '28%' }]}>Away</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '13%' }]}>Pick</Text>
                    <Text style={[styles.cell, styles.headerCell, { width: '10%' }]}>Pts</Text>
                    <Text style={[styles.cell, styles.headerCell, styles.lastCell, styles.checkboxCell, { width: '12%' }]}>Correct</Text>
                  </View>
                  {slice.map((match) => (
                    <View key={match.id} style={styles.row} wrap={false}>
                      <Text style={[styles.cell, { width: '9%' }]}>{match.id}</Text>
                      <Text style={[styles.cell, { width: '28%' }]}>{teamName(match.home)}</Text>
                      <Text style={[styles.cell, { width: '28%' }]}>{teamName(match.away)}</Text>
                      <Text style={[styles.cell, { width: '13%' }]}>{groupPickCode(match.id, groupMatches[match.id])}</Text>
                      <Text style={[styles.cell, { width: '10%' }]}>+{GROUP_POINTS}</Text>
                      <View style={[styles.cell, styles.lastCell, styles.checkboxCell, { width: '12%' }]}>
                        <View style={styles.checkbox} />
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalRow} wrap={false}>
                    <Text style={[styles.totalLabel, { width: '70%' }]}>TOTAL</Text>
                    <Text style={[styles.totalValue, { width: '30%' }]}>_____ / {slice.length * GROUP_POINTS}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </Page>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knockout Picks</Text>
          <Text style={styles.sectionSubtitle}>
            Points awarded per round when your pick advances. Champion match adds a separate +{CHAMPION_POINTS} bonus.
          </Text>

          <View style={styles.bonusRow} wrap={false}>
            <Text style={styles.bonusLabel}>Champion (+{CHAMPION_POINTS})</Text>
            <Text style={styles.bonusPick}>{teamName(championCode)}</Text>
            <View style={styles.bonusCheckCell}>
              <View style={styles.checkbox} />
            </View>
          </View>

          <View style={styles.table}>
            <View style={[styles.row, styles.tableHeaderRow]} wrap={false}>
              <Text style={[styles.cell, styles.headerCell, { width: '6%' }]}>Match</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '12%' }]}>Round</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '30%' }]}>Home</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '30%' }]}>Away</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '7%' }]}>Pick</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '6%' }]}>Pts</Text>
              <Text style={[styles.cell, styles.headerCell, styles.lastCell, styles.checkboxCell, { width: '9%' }]}>Correct</Text>
            </View>
            {orderedKnockout.map((match) => (
              <View key={match.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '6%' }]}>{match.id}</Text>
                <Text style={[styles.cell, { width: '12%' }]}>{roundLabels[match.round]}</Text>
                <Text style={[styles.cell, { width: '30%' }]}>{teamName(match.home)}</Text>
                <Text style={[styles.cell, { width: '30%' }]}>{teamName(match.away)}</Text>
                <Text style={[styles.cell, { width: '7%' }]}>
                  {knockoutPickCode(match.home, match.away, match.result)}
                </Text>
                <Text style={[styles.cell, { width: '6%' }]}>
                  +{KNOCKOUT_POINTS[match.round] ?? 0}
                </Text>
                <View style={[styles.cell, styles.lastCell, styles.checkboxCell, { width: '9%' }]}>
                  <View style={styles.checkbox} />
                </View>
              </View>
            ))}
            <View style={styles.totalRow} wrap={false}>
              <Text style={[styles.totalLabel, { width: '75%' }]}>TOTAL (rounds + champion bonus)</Text>
              <Text style={[styles.totalValue, { width: '25%' }]}>_____ / {knockoutMaxPoints + CHAMPION_POINTS}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          This PDF is a submitted prediction snapshot. Share link: {shareUrl}
        </Text>
      </Page>
    </Document>
  );
}

export async function generatePredictionPdf(params: GeneratePredictionPdfParams): Promise<Buffer> {
  return renderToBuffer(<PredictionPdfDocument {...params} />);
}
