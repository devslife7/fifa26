'use client';

interface Props {
  onSignIn: () => void;
}

export default function SignedOutHero({ onSignIn }: Props) {
  return (
    <section className="relative -mx-3 pb-3 sm:-mx-4 md:mx-0">
      <div className="relative mx-auto w-full overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-[440px] sm:rounded-b-[32px] md:max-w-full">
        <img
          src="/images/promotional-image-hero.png"
          alt="FIFA World Cup 2026"
          className="block w-full object-cover object-[50%_15%] min-h-[320px] [height:calc(100svh-260px)] [max-height:600px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/55 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-black/45 px-3 py-1 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-[9px] font-black uppercase tracking-[0.22em] text-primary">
              World Cup 2026 · Live
            </span>
          </span>

          <h1 className="mt-3 text-[30px] font-black leading-[1.05] text-white">
            Track your bracket
          </h1>
          <p className="mt-1.5 max-w-[34ch] font-body text-sm font-semibold leading-relaxed text-neutral-300">
            Sign in to follow your picks, score every result, and see where you rank against everyone.
          </p>

          <button
            type="button"
            onClick={onSignIn}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-[16px] bg-primary px-5 py-3 font-body text-sm font-black text-black transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            Sign in
          </button>
        </div>
      </div>
    </section>
  );
}
