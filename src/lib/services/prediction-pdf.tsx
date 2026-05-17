import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { allGroupMatches } from '@/data/matches';
import { teamsByCode, groups } from '@/data/teams';
import { generateBracket, getTopThree } from '@/lib/logic/bracket';
import { getGroupQualifiers } from '@/lib/logic/standings';
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
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 9,
  },
  label: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 7,
  },
  table: {
    border: '1px solid #e5e7eb',
    borderBottom: 0,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    minHeight: 21,
  },
  headerRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    padding: 5,
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
  footer: {
    marginTop: 14,
    paddingTop: 9,
    borderTop: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: 8,
  },
});

function teamName(code: string | undefined | null): string {
  if (!code) return 'TBD';
  const team = teamsByCode[code];
  return team ? `${team.name} (${team.code})` : code;
}

function groupPickLabel(matchId: string, result: MatchResult | undefined): string {
  const match = allGroupMatches.find((m) => m.id === matchId);
  if (!match || !result) return 'Not picked';
  if (result === 'draw') return 'Draw';
  return teamName(result === 'home' ? match.home : match.away);
}

function knockoutPickLabel(home: string | undefined, away: string | undefined, result: KnockoutResult | undefined): string {
  if (!result) return 'Not picked';
  return teamName(result === 'home' ? home : away);
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
  const topThree = getTopThree(groupMatches, knockoutMatches, thirdPlaceTiebreaker ?? undefined);
  const qualifiers = getGroupQualifiers(groupMatches);
  const orderedKnockout = bracket.sort((a, b) => {
    const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
    const roundDiff = roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
    return roundDiff || a.position - b.position;
  });

  return (
    <Document
      title={`FIFA 26 Prediction ${predictionNumber ? `#${predictionNumber}` : ''}`}
      author="FIFA 26 Predictions"
      subject="Submitted prediction snapshot"
    >
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>FIFA 26 Predictions</Text>
        <Text style={styles.subtitle}>
          Submitted snapshot{predictionNumber ? ` #${predictionNumber}` : ''} - {submittedDate(submittedAt)}
        </Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Predictor</Text>
            <Text style={styles.value}>{name}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Champion</Text>
            <Text style={styles.value}>{teamName(topThree.first)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Runner-up</Text>
            <Text style={styles.value}>{teamName(topThree.second)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Third Place</Text>
            <Text style={styles.value}>{teamName(topThree.third)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Qualifiers</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, { width: '12%' }]}>Group</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '44%' }]}>Winner</Text>
              <Text style={[styles.cell, styles.headerCell, styles.lastCell, { width: '44%' }]}>Runner-up</Text>
            </View>
            {groups.map((group) => (
              <View key={group} style={styles.row}>
                <Text style={[styles.cell, { width: '12%', fontFamily: 'Helvetica-Bold' }]}>{group}</Text>
                <Text style={[styles.cell, { width: '44%' }]}>{teamName(qualifiers.winners[group])}</Text>
                <Text style={[styles.cell, styles.lastCell, { width: '44%' }]}>{teamName(qualifiers.runnersUp[group])}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Stage Picks</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, { width: '11%' }]}>Match</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '12%' }]}>Group</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '31%' }]}>Home</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '31%' }]}>Away</Text>
              <Text style={[styles.cell, styles.headerCell, styles.lastCell, { width: '15%' }]}>Pick</Text>
            </View>
            {allGroupMatches.map((match) => (
              <View key={match.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '11%' }]}>{match.id}</Text>
                <Text style={[styles.cell, { width: '12%' }]}>{match.group}</Text>
                <Text style={[styles.cell, { width: '31%' }]}>{teamName(match.home)}</Text>
                <Text style={[styles.cell, { width: '31%' }]}>{teamName(match.away)}</Text>
                <Text style={[styles.cell, styles.lastCell, { width: '15%' }]}>{groupPickLabel(match.id, groupMatches[match.id])}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knockout Picks</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, { width: '13%' }]}>Match</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '17%' }]}>Round</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '27%' }]}>Home</Text>
              <Text style={[styles.cell, styles.headerCell, { width: '27%' }]}>Away</Text>
              <Text style={[styles.cell, styles.headerCell, styles.lastCell, { width: '16%' }]}>Winner</Text>
            </View>
            {orderedKnockout.map((match) => (
              <View key={match.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '13%' }]}>{match.id}</Text>
                <Text style={[styles.cell, { width: '17%' }]}>{roundLabels[match.round]}</Text>
                <Text style={[styles.cell, { width: '27%' }]}>{teamName(match.home)}</Text>
                <Text style={[styles.cell, { width: '27%' }]}>{teamName(match.away)}</Text>
                <Text style={[styles.cell, styles.lastCell, { width: '16%' }]}>
                  {knockoutPickLabel(match.home, match.away, match.result)}
                </Text>
              </View>
            ))}
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
