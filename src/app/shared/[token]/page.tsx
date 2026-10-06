import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import shared from '@/data/archive/shared.json';
import type { MatchResult, KnockoutResult } from '@/types';
import SharedPredictionView from '@/components/shared/SharedPredictionView';

export const dynamicParams = false;
export function generateStaticParams() {
  return shared.map(({ token }) => ({ token }));
}
interface Props { params: Promise<{ token: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const entry = shared.find(p => p.token === token);
  return { title: entry ? `${entry.prediction.display_name}’s prediction · World Cup 2026 archive` : 'Prediction not found' };
}
export default async function SharedBracketPage({ params }: Props) {
  const { token } = await params;
  const entry = shared.find(p => p.token === token);
  if (!entry) notFound();
  const prediction = entry.prediction;
  return <SharedPredictionView
    displayName={prediction.display_name}
    championCode={prediction.champion_code}
    groupMatches={prediction.group_matches as Record<string, MatchResult>}
    knockoutMatches={prediction.knockout_matches as Record<string, KnockoutResult>}
    thirdPlaceTiebreaker={prediction.third_place_tiebreaker ?? undefined}
  />;
}
