'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { MatchResult, KnockoutResult, KnockoutRound } from '@/types';
import { generateBracket, getChampion } from '@/lib/bracket';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';
import { loadPredictions, getEditingPredictionId, getEditingPredictionName, setEditingPrediction } from '@/lib/storage';
import AuthModal from '@/components/AuthModal';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
}

function FlagEmoji({ code, flagEmoji, size = 'normal' }: { code: string; flagEmoji: string; size?: 'small' | 'normal' }) {
  if (code.startsWith('TBD')) return null;
  const emojiClass = size === 'small' ? "text-lg leading-none" : "text-2xl leading-none";
  return <span className={emojiClass}>{flagEmoji}</span>;
}

function CompactBracketView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker }: Props) {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const rounds: KnockoutRound[] = ['R16', 'QF', 'SF', 'F']; // Skip R32 to save space
  
  return (
    <div className="flex gap-6 p-8 bg-neutral-50 w-full h-[800px] items-center justify-center">
      {rounds.map(round => {
        const matches = bracket.filter(m => m.round === round);
        return (
          <div key={round} className="flex flex-col justify-around h-full flex-1 gap-4">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest text-center mb-2">
              {round === 'F' ? 'Final' : round}
            </h3>
            <div className="flex flex-col justify-around h-full">
              {matches.map(match => {
                const home = match.home ? teamsByCode[match.home] : null;
                const away = match.away ? teamsByCode[match.away] : null;
                const isHomeWinner = match.result === 'home';
                const isAwayWinner = match.result === 'away';
                
                return (
                  <div key={match.id} className="flex flex-col bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden text-sm">
                    <div className={`flex items-center gap-3 px-4 py-3 border-b border-neutral-100 ${isHomeWinner ? 'bg-neutral-50 font-bold text-neutral-800' : 'text-neutral-500'}`}>
                      {home ? <FlagEmoji code={match.home!} flagEmoji={home.flag} size="normal" /> : <div className="w-7" />}
                      <span className="truncate font-body">{home?.name || 'TBD'}</span>
                    </div>
                    <div className={`flex items-center gap-3 px-4 py-3 ${isAwayWinner ? 'bg-neutral-50 font-bold text-neutral-800' : 'text-neutral-500'}`}>
                      {away ? <FlagEmoji code={match.away!} flagEmoji={away.flag} size="normal" /> : <div className="w-7" />}
                      <span className="truncate font-body">{away?.name || 'TBD'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ChampionScreen({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker }: Props) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const champion = championCode ? teamsByCode[championCode] : null;

  const handleSave = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    await savePredictions();
  };

  const savePredictions = async () => {
    setSaving(true);
    setError(null);

    try {
      const local = loadPredictions();
      const predictionId = getEditingPredictionId();
      const predictionName = getEditingPredictionName();

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: predictionId || undefined,
          name: predictionName || 'My Predictions',
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
          championCode,
          isComplete: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }

      // Track the saved prediction ID for future updates
      if (data.predictions?.id) {
        setEditingPrediction(data.predictions.id, data.predictions.name);
      }

      // Auto-activate if this is the first complete prediction
      if (data.predictions?.id && !data.predictions?.is_active) {
        fetch('/api/predictions/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: data.predictions.id }),
        }).catch(() => {});
      }

      if (data.predictions?.share_token) {
        setShareUrl(`${window.location.origin}/shared/${data.predictions.share_token}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleScreenshot = async () => {
    if (!captureRef.current) return;
    setTakingScreenshot(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: 'var(--color-neutral-50)',
        scale: 2, // higher res
        logging: false,
        useCORS: true,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          // html2canvas doesn't support oklch/lab colors yet, so we need to
          // convert any tailwind v4 oklch colors to hex/rgb in the cloned document
          // before rendering
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Fix text color
            if (style.color && (style.color.includes('oklch') || style.color.includes('lab'))) {
              // Fallback to a safe dark slate color for text
              el.style.color = '#1e293b';
            }
            
            // Fix background color
            if (style.backgroundColor && (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('lab'))) {
              // Fallback to white or transparent depending on context
              if (el.classList.contains('bg-white')) {
                el.style.backgroundColor = '#ffffff';
              } else if (el.classList.contains('bg-neutral-50')) {
                el.style.backgroundColor = '#f8fafc';
              } else {
                el.style.backgroundColor = 'transparent';
              }
            }
            
            // Fix border color
            if (style.borderColor && (style.borderColor.includes('oklch') || style.borderColor.includes('lab'))) {
              el.style.borderColor = '#e2e8f0'; // neutral-200
            }
          }
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      
      // Try to use the native share API if available (works well on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(image)).blob();
          const file = new File([blob], `fifa26-champion-${champion?.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'My FIFA 26 Champion Prediction',
              files: [file]
            });
            return; // If share succeeds, we're done
          }
        } catch (shareErr) {
          console.log('Share API failed or was cancelled, falling back to download', shareErr);
        }
      }
      
      // Fallback to standard download
      const link = document.createElement('a');
      link.download = `fifa26-champion-${champion?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to take screenshot:', err);
    } finally {
      setTakingScreenshot(false);
    }
  };

  if (!champion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-6 animate-trophy-glow">🏆</div>
        <h2 className="text-3xl font-bold mb-3">Your Champion</h2>
        <p className="text-neutral-400 max-w-md">
          Complete all match predictions to reveal your predicted FIFA World Cup 2026 champion
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Hidden container for the full bracket screenshot */}
      <div className="overflow-hidden h-0 w-0 absolute left-[-9999px]">
        <div ref={captureRef} className="bg-neutral-50 p-12 flex flex-col items-center w-[1200px]">
          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="text-7xl">🏆</div>
            <div>
              <h2 className="text-4xl font-black text-neutral-800">My FIFA 26 Predictions</h2>
              <p className="text-neutral-500 font-medium text-xl mt-1">Champion: <span className="text-primary font-bold font-body">{champion.name}</span></p>
            </div>
          </div>
          
          <div className="w-full bg-white rounded-[2rem] shadow-sm border border-neutral-200 overflow-hidden">
            <CompactBracketView 
              groupPredictions={groupPredictions} 
              knockoutPredictions={knockoutPredictions} 
              thirdPlaceTiebreaker={thirdPlaceTiebreaker} 
            />
          </div>
          
          <div className="mt-10 text-neutral-400 font-bold tracking-widest uppercase text-base">
            fifa26.app
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full p-8 rounded-3xl bg-white/5">
        <div className="relative mb-8">
          <div className="text-8xl animate-trophy-glow">🏆</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-primary/20 rounded-full blur-xl" />
        </div>

        <div className="mb-6">
          <span className="text-7xl">{champion.flag}</span>
        </div>

        <h2 className="text-4xl font-black mb-2 text-primary font-body">
          {champion.name}
        </h2>

        <p className="text-neutral-400 text-sm uppercase tracking-[0.2em] font-medium mb-8">
          Your Predicted Champion
        </p>

        <div className="bg-neutral-900 rounded-2xl border border-primary/20 px-8 py-6 max-w-sm shadow-sm animate-pulse-gold">
          <p className="text-neutral-500 text-sm">
            FIFA World Cup 2026
          </p>
          <p className="text-primary font-bold text-lg mt-1 font-body">
            {champion.flag} {champion.name}
          </p>
        </div>
      </div>

      {/* Save & Share Section */}
      <div className="mt-8 w-full max-w-sm">
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleScreenshot}
            disabled={takingScreenshot}
            className="flex-1 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              {takingScreenshot ? 'hourglass_empty' : 'photo_camera'}
            </span>
            {takingScreenshot ? 'Saving...' : 'Save Image'}
          </button>
        </div>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="bg-wc-green/15 border border-wc-green/30 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-wc-green text-2xl font-variation-fill">check_circle</span>
              <p className="text-wc-green font-bold mt-1">Predictions Saved!</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-background-dark text-white font-bold rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Share Link
            </button>
            <p className="text-xs text-neutral-400 break-all">{shareUrl}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <span className="material-symbols-outlined font-variation-fill">share</span>
                  Save & Share
                </>
              )}
            </button>
            {!user && (
              <p className="text-xs text-neutral-400 mt-2">You&apos;ll need to sign in to save</p>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => {
            setShowAuth(false);
            savePredictions();
          }}
        />
      )}
    </div>
  );
}
