'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

interface ProfileHeaderProps {
  darkMode: boolean;
  onSignIn: () => void;
}

export default function ProfileHeader({ darkMode: d, onSignIn }: ProfileHeaderProps) {
  const { user, updateDisplayName, signOut } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const displayName = user?.user_metadata?.display_name || 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
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
            <>
              <h1 className={`text-base font-black truncate ${d ? 'text-white' : 'text-neutral-900'}`}>{displayName}</h1>
              <p className={`text-xs truncate ${d ? 'text-white/35' : 'text-neutral-400'}`}>{user.email}</p>
            </>
          ) : (
            <>
              <h1 className={`text-base font-black ${d ? 'text-white' : 'text-neutral-900'}`}>Guest</h1>
              <p className={`text-xs ${d ? 'text-white/35' : 'text-neutral-400'}`}>Sign in to save predictions</p>
            </>
          )}
        </div>

        {/* Right side: Three-dot menu (signed in) or Sign In (guest) */}
        {user ? (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-1.5 rounded-lg transition-colors ${d ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${d ? 'text-white/40' : 'text-neutral-400'}`}>more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-neutral-800 border border-white/10 shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setNameInput(user.user_metadata?.display_name || '');
                    setEditingName(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit Name
                </button>
                <button
                  onClick={() => {
                    setShowSignOutConfirm(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-wc-red/80 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Sign in
          </button>
        )}
      </div>

      {/* Edit Name Modal */}
      {editingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingName(false)}>
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-xl ${d ? 'bg-neutral-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 ${d ? 'text-white' : ''}`}>Edit Display Name</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!nameInput.trim()) return;
              setNameSaving(true);
              await updateDisplayName(nameInput.trim());
              setNameSaving(false);
              setEditingName(false);
            }}>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
                placeholder="Enter your name"
                className={`w-full px-4 py-3 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-bold mb-4 ${
                  d ? 'bg-white/10 border-white/20 text-white placeholder-white/30' : 'border-neutral-200'
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                    d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nameSaving || !nameInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {nameSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSignOutConfirm(false)}>
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-xl ${d ? 'bg-neutral-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-2 ${d ? 'text-white' : ''}`}>Sign Out?</h3>
            <p className={`text-sm mb-4 ${d ? 'text-white/50' : 'text-neutral-500'}`}>Are you sure?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                  d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                className="flex-1 py-3 rounded-xl bg-wc-red text-white font-bold text-sm hover:bg-wc-red/90 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
