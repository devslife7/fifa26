'use client';

interface Props {
  onSignIn: () => void;
}

export default function SignedOutHero({ onSignIn }: Props) {
  return (
    <section className="home-signin-hero relative -mx-3 pb-3 sm:-mx-4 md:mx-0">
      <div className="home-hero-frame relative mx-auto w-full overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-[440px] sm:rounded-b-[32px] md:max-w-full">
        <picture className="contents">
          <source media="(min-width: 1024px)" srcSet="/images/desktop-hero-2026.png" />
        <img
          src="/images/promotional-image-hero.png"
          alt="FIFA World Cup 2026"
          className="home-hero-art block w-full object-cover object-[50%_15%] min-h-[320px] [height:calc(100svh-260px)] [max-height:600px]"
        />
        </picture>
        <div
          aria-hidden
          className="home-hero-shade pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/55 to-transparent"
        />

        <div className="home-hero-copy absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-6">
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
