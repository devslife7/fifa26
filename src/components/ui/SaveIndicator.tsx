'use client';

import { useState, useEffect, useRef } from 'react';

export default function SaveIndicator() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener('predictions-saved', handler);
    return () => {
      window.removeEventListener('predictions-saved', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-wc-green/15 border border-wc-green/30 text-wc-green text-xs font-semibold transition-all duration-300 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className="material-symbols-outlined text-[14px] font-variation-fill">check_circle</span>
      Saved
    </div>
  );
}
