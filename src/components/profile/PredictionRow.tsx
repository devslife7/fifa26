'use client';

import { useState } from 'react';
import { SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import { getTopThree } from '@/lib/logic/bracket';
import PredictionDetailCard from './PredictionDetailCard';

interface PredictionRowProps {
  prediction: SavedPrediction;
  isCurrentlyEditing: boolean;
  isExpanded: boolean;
  darkMode: boolean;
  onToggleExpand: () => void;
  onView: () => void;
  onEdit: () => void;
  onRename: (newName: string) => void;
  onSetActive: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onCopyImage: () => void;
  isCopyingImage: boolean;
  copySuccess: boolean;
}

export default function PredictionRow({
  prediction: p, isCurrentlyEditing, isExpanded, darkMode: d,
  onToggleExpand, onView, onEdit, onRename, onSetActive, onCopyLink, onDelete, onCopyImage, isCopyingImage, copySuccess,
}: PredictionRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const groupCount = Object.keys(p.group_matches ?? {}).length;
  const knockoutCount = Object.keys(p.knockout_matches ?? {}).length;
  const pct = Math.round(((groupCount + knockoutCount) / (72 + 32)) * 100);
  const champion = p.champion_code ? teamsByCode[p.champion_code] : null;

  const topThree = p.is_complete
    ? getTopThree(p.group_matches ?? {}, p.knockout_matches ?? {}, p.third_place_tiebreaker ?? undefined, p.group_tiebreakers ?? {})
    : null;
  const firstTeam = topThree?.first ? teamsByCode[topThree.first] : null;
  const secondTeam = topThree?.second ? teamsByCode[topThree.second] : null;
  const thirdTeam = topThree?.third ? teamsByCode[topThree.third] : null;

  // Delete confirmation
  if (deleting) {
    return (
      <div className={`rounded-2xl border p-4 ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100'}`}>
        <p className="text-sm text-wc-red font-medium mb-3">Delete &ldquo;{p.name}&rdquo;?</p>
        <div className="flex gap-2">
          <button
            onClick={() => { onDelete(); setDeleting(false); }}
            className="flex-1 py-2 rounded-lg bg-wc-red text-white font-semibold text-sm hover:bg-wc-red/90 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setDeleting(false)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
              d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Rename inline
  if (renaming) {
    return (
      <div className={`rounded-2xl border p-4 ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100'}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renameInput.trim()) {
              onRename(renameInput.trim());
              setRenaming(false);
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={renameInput}
            onChange={e => setRenameInput(e.target.value)}
            autoFocus
            className={`flex-grow min-w-0 px-3 py-2 rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-bold ${
              d ? 'bg-white/10 border-white/20 text-white' : 'border-neutral-200'
            }`}
          />
          <button type="submit" className="p-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
          <button type="button" onClick={() => setRenaming(false)} className={`p-2 rounded-lg transition-colors ${d ? 'bg-white/10 hover:bg-white/15' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
            <span className={`material-symbols-outlined text-[18px] ${d ? 'text-white/50' : 'text-neutral-500'}`}>close</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-colors ${
        d
          ? isCurrentlyEditing
            ? 'bg-white/10 border-primary/40 ring-1 ring-primary/20'
            : p.is_active
              ? 'bg-white/5 border-primary/30'
              : 'bg-white/5 border-white/10'
          : isCurrentlyEditing
            ? 'bg-white border-primary/40 ring-1 ring-primary/20'
            : p.is_active
              ? 'bg-white border-primary/30'
              : 'bg-white border-neutral-100'
      }`}
    >
      {/* Main row — tap to expand */}
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        {/* Champion flag or progress ring */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative">
          {champion ? (
            <span className="text-2xl">{champion.flag}</span>
          ) : (
            <>
              <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke={d ? 'rgba(255,255,255,0.1)' : 'var(--color-neutral-100)'} strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke={pct > 0 ? 'var(--color-primary)' : 'transparent'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
                />
              </svg>
              <span className={`relative ${pct === 100 ? 'text-[8px]' : 'text-[10px]'} font-bold ${d ? 'text-white/40' : 'text-neutral-400'}`}>{pct}%</span>
            </>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold truncate ${d ? 'text-white' : 'text-neutral-800'}`}>
              {p.name}
              {p.prediction_number != null && (
                <span className={`font-mono ml-1.5 ${d ? 'text-white/30' : 'text-neutral-400'}`}>#{p.prediction_number}</span>
              )}
            </p>
            {p.is_active && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold flex-shrink-0">
                <span className="material-symbols-outlined text-[12px] font-variation-fill">star</span>
                Active
              </span>
            )}
            {isCurrentlyEditing && !p.is_complete && (
              <span className="inline-flex px-1.5 py-0.5 rounded-md bg-wc-blue-light text-wc-blue text-[10px] font-bold flex-shrink-0">
                Editing
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {!p.is_complete && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-wc-amber-light text-wc-amber text-[10px] font-bold border border-wc-amber-border">
                <span className="material-symbols-outlined text-[11px]">pending</span>
                In Progress
              </span>
            )}
            <span className={`text-[10px] ${d ? 'text-white/20' : 'text-neutral-300'}`}>
              {new Date(p.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          {/* Podium: 1st, 2nd, 3rd */}
          {firstTeam && secondTeam && thirdTeam && (
            <div className="flex items-center gap-2.5 mt-1.5">
              {[
                { team: firstTeam, color: 'text-medal-gold', label: '1st' },
                { team: secondTeam, color: 'text-medal-silver', label: '2nd' },
                { team: thirdTeam, color: 'text-medal-bronze', label: '3rd' },
              ].map(({ team, color, label }) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <span className={`text-[10px] font-bold ${color}`}>{label}</span>
                  <span className="text-sm">{team.flag}</span>
                  <span className={`text-[10px] ${d ? 'text-white/40' : 'text-neutral-500'}`}>{team.code}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''} ${d ? 'text-white/20' : 'text-neutral-300'}`}>
          expand_more
        </span>
      </button>

      {/* Expanded detail + actions */}
      {isExpanded && (
        <>
        <PredictionDetailCard prediction={p} darkMode={d} />
        <div className={`px-4 pb-3 pt-0 flex items-center gap-2 flex-wrap border-t ${d ? 'border-white/5' : 'border-neutral-50'}`}>
          <div className="w-full pt-2.5 flex items-center gap-2 flex-wrap">
            <button
              onClick={onView}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              View
            </button>
            <button
              onClick={onCopyImage}
              disabled={isCopyingImage}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                copySuccess
                  ? 'bg-wc-green/15 text-wc-green'
                  : d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{isCopyingImage ? 'hourglass_empty' : copySuccess ? 'check' : 'content_copy'}</span>
              {isCopyingImage ? 'Copying...' : copySuccess ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onEdit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Edit
            </button>
            <button
              onClick={() => { setRenameInput(p.name); setRenaming(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">drive_file_rename_outline</span>
              Rename
            </button>
            {p.is_complete && !p.is_active && (
              <button
                onClick={onSetActive}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] font-variation-fill">star</span>
                Set Active
              </button>
            )}
            {p.share_token && (
              <button
                onClick={onCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">link</span>
                Copy Link
              </button>
            )}
            {p.pdf_path && (
              <button
                onClick={() => window.open(`/api/predictions/manage/${p.id}/pdf`, '_blank', 'noopener,noreferrer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  d ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                PDF
              </button>
            )}
            <button
              onClick={() => setDeleting(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-wc-red hover:bg-wc-red/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Delete
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
