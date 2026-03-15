'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

interface ProfileHeaderProps {
  darkMode: boolean;
  onSignIn: () => void;
}

export default function ProfileHeader({ darkMode: d, onSignIn }: ProfileHeaderProps) {
  const { user, updateDisplayName } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  const displayName = user?.user_metadata?.display_name || 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`flex items-center gap-3 py-3 ${d ? 'text-white' : ''}`}>
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        user
          ? 'bg-gradient-to-br from-primary/20 to-wc-blue/15 border border-primary/25'
          : 'bg-gradient-to-br from-white/10 to-neutral-100 border border-neutral-200'
      } ${d && !user ? 'border-white/10 from-white/5 to-white/10' : ''}`}>
        {user ? (
          <span className="text-primary font-black text-sm">{initials}</span>
        ) : (
          <span className={`material-symbols-outlined text-xl ${d ? 'text-white/40' : 'text-neutral-400'}`}>person</span>
        )}
      </div>

      {/* Name + Email */}
      <div className="min-w-0 flex-1">
        {user ? (
          editingName ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nameInput.trim()) return;
                setNameSaving(true);
                await updateDisplayName(nameInput.trim());
                setNameSaving(false);
                setEditingName(false);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
                className={`flex-grow min-w-0 px-2.5 py-1 rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none text-sm font-bold ${
                  d ? 'bg-white/10 border-white/20 text-white placeholder-white/40' : 'border-neutral-200'
                }`}
              />
              <button
                type="submit"
                disabled={nameSaving || !nameInput.trim()}
                className="p-1 rounded-lg bg-primary text-black hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className={`p-1 rounded-lg transition-colors ${d ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-base font-black truncate ${d ? 'text-white' : 'text-neutral-900'}`}>{displayName}</h1>
                <button
                  onClick={() => {
                    setNameInput(user.user_metadata?.display_name || '');
                    setEditingName(true);
                  }}
                  className={`p-0.5 rounded transition-colors flex-shrink-0 ${d ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
                >
                  <span className={`material-symbols-outlined text-[14px] ${d ? 'text-white/30' : 'text-neutral-400'}`}>edit</span>
                </button>
              </div>
              <p className={`text-xs truncate ${d ? 'text-white/35' : 'text-neutral-400'}`}>{user.email}</p>
            </>
          )
        ) : (
          <>
            <h1 className={`text-base font-black ${d ? 'text-white' : 'text-neutral-900'}`}>Guest</h1>
            <p className={`text-xs ${d ? 'text-white/35' : 'text-neutral-400'}`}>Sign in to save predictions</p>
          </>
        )}
      </div>

      {/* Right side: Sign In (guest) or Dark mode toggle */}
      {!user && (
        <button
          onClick={onSignIn}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
