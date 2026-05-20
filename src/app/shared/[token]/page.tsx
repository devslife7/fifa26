import { createServiceClient } from '@/lib/services/supabase/server';
import { MatchResult, KnockoutResult, GroupTiebreakers } from '@/types';
import { notFound } from 'next/navigation';
import SharedPredictionView from '@/components/shared/SharedPredictionView';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedBracketPage({ params }: Props) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('id, prediction_number, name, submitter_name, champion_code, group_matches, knockout_matches, group_tiebreakers, third_place_tiebreaker, share_token, is_complete, profiles(display_name)')
    .eq('share_token', token)
    .eq('is_complete', true)
    .single();

  if (error || !data) {
    notFound();
  }

  const profile = data.profiles as unknown as { display_name: string } | null;
  const displayName = profile?.display_name ?? data.submitter_name ?? 'Someone';

  return (
    <SharedPredictionView
      displayName={displayName}
      championCode={data.champion_code}
      groupMatches={data.group_matches as Record<string, MatchResult>}
      knockoutMatches={data.knockout_matches as Record<string, KnockoutResult>}
      groupTiebreakers={(data.group_tiebreakers as GroupTiebreakers | null) ?? {}}
      thirdPlaceTiebreaker={(data.third_place_tiebreaker as string[] | null) ?? undefined}
    />
  );
}
