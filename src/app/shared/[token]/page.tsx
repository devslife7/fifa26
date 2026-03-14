import { createClient } from '@/lib/supabase/server';
import { teamsByCode } from '@/data/teams';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedBracketPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('*, profiles(display_name)')
    .eq('share_token', token)
    .eq('is_complete', true)
    .single();

  if (error || !data) {
    notFound();
  }

  const profile = data.profiles as unknown as { display_name: string } | null;
  const displayName = profile?.display_name ?? 'Someone';
  const championCode = data.champion_code;
  const champion = championCode ? teamsByCode[championCode] : null;
  const groupMatches = data.group_matches as Record<string, string>;
  const knockoutMatches = data.knockout_matches as Record<string, string>;

  const groupCount = Object.keys(groupMatches).length;
  const knockoutCount = Object.keys(knockoutMatches).length;

  return (
    <div className="min-h-screen bg-background-light font-display text-neutral-800">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold mb-1">{displayName}&apos;s Predictions</h1>
          <p className="text-neutral-400 text-sm">FIFA World Cup 2026</p>
        </div>

        {/* Champion */}
        {champion && (
          <div className="bg-white rounded-2xl border border-primary/20 p-6 text-center mb-6 shadow-sm">
            <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2">Predicted Champion</p>
            <div className="text-5xl mb-2">{champion.flag}</div>
            <p className="text-2xl font-black text-primary">{champion.name}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
            <div className="text-2xl font-black text-primary">{groupCount}</div>
            <div className="text-xs text-neutral-400">Group Predictions</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
            <div className="text-2xl font-black text-primary">{knockoutCount}</div>
            <div className="text-xs text-neutral-400">Knockout Predictions</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Make Your Own Predictions
          </a>
        </div>
      </div>
    </div>
  );
}
