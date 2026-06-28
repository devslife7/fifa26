'use client';

import { useState } from 'react';
import { GROUP_POINTS, QUALIFIER_POINTS, RUNNER_UP_POINTS, WINNER_POINTS } from '@/lib/logic/scoring';

type Lang = 'en' | 'es';

const LOCALES = {
  en: {
    title: 'How you earn points',
    descGroup: 'In the group stage, you get ',
    descGroupBold: '+1 for every correct match result',
    descGroupPost: ' (home win, draw, or away win).',
    descKnockout: ' In the knockouts, you earn points for every team in your bracket that actually reaches a round — they ',
    descKnockoutBold: 'stack as the team advances',
    descKnockoutPost: '.',
    sectionGroup: 'Group stage',
    sectionAdvances: 'Per team that advances',
    sectionBonuses: 'Winner bonuses',
    groupRow: { label: 'Per match', sub: 'Each correct group stage result' },
    rows: [
      { label: 'Round of 16', sub: 'Each team that wins its R32 match' },
      { label: 'Quarter-finals', sub: 'Each team that reaches the QF' },
      { label: 'Semi-finals', sub: 'Each team that reaches the SF' },
      { label: '3rd-place match', sub: 'Each team in the 3rd-place match' },
      { label: 'Final', sub: 'Each team that reaches the Final' },
    ],
    bonuses: [
      { label: '3rd-place winner', sub: 'Bonus for the correct winner' },
      { label: 'Runner-up', sub: 'Bonus for the correct 2nd place' },
      { label: 'Champion', sub: 'Bonus for the correct champion' },
    ],
  },
  es: {
    title: 'Cómo ganas puntos',
    descGroup: 'En la fase de grupos, obtienes ',
    descGroupBold: '+1 por cada resultado correcto',
    descGroupPost: ' (victoria local, empate o victoria visitante).',
    descKnockout: ' En la eliminatoria, ganas puntos por cada equipo en tu bracket que llegue a una ronda — ',
    descKnockoutBold: 'se acumulan a medida que avanza',
    descKnockoutPost: '.',
    sectionGroup: 'Fase de grupos',
    sectionAdvances: 'Por equipo que avanza',
    sectionBonuses: 'Bonos por ganador',
    groupRow: { label: 'Por partido', sub: 'Cada resultado correcto en grupos' },
    rows: [
      { label: 'Octavos de final', sub: 'Cada equipo que gana en R32' },
      { label: 'Cuartos de final', sub: 'Cada equipo que llega a cuartos' },
      { label: 'Semifinales', sub: 'Cada equipo que llega a semis' },
      { label: 'Partido 3° lugar', sub: 'Cada equipo en el partido por 3°' },
      { label: 'Final', sub: 'Cada equipo que llega a la Final' },
    ],
    bonuses: [
      { label: 'Ganador del 3° lugar', sub: 'Bono por el ganador correcto' },
      { label: 'Subcampeón', sub: 'Bono por el 2° lugar correcto' },
      { label: 'Campeón', sub: 'Bono por el campeón correcto' },
    ],
  },
} as const;

const ROUND_PTS = [
  QUALIFIER_POINTS.R16,
  QUALIFIER_POINTS.QF,
  QUALIFIER_POINTS.SF,
  QUALIFIER_POINTS['3RD'],
  QUALIFIER_POINTS.FIN,
];

const BONUS_PTS = [WINNER_POINTS['3RD'], RUNNER_UP_POINTS, WINNER_POINTS.FIN];

function Row({
  label,
  sub,
  pts,
  highlight = false,
}: {
  label: string;
  sub: string;
  pts: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-[9px] border-b border-white/[0.04] last:border-0">
      <div className="min-w-0">
        <p className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-neutral-100'} font-body`}>
          {label}
        </p>
        <p className="text-[11px] leading-tight text-neutral-500 font-body">{sub}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <div className="flex gap-px">
          {Array.from({ length: pts }).map((_, j) => (
            <div key={j} className={`w-[3px] h-[10px] rounded-full ${highlight ? 'bg-primary/60' : 'bg-primary/30'}`} />
          ))}
        </div>
        <span className={`text-sm font-black tabular-nums w-7 text-right ${highlight ? 'text-primary' : 'text-neutral-200'}`}>
          +{pts}
        </span>
      </div>
    </div>
  );
}

export default function KnockoutScoringCard() {
  const [lang, setLang] = useState<Lang>('es');
  const t = LOCALES[lang];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/80 to-background-dark">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[19px] font-black leading-tight text-white">
            {t.title}
          </h2>
          <div className="flex flex-shrink-0 items-center rounded-full border border-white/15 bg-white/8 p-1 gap-0.5">
            <button
              onClick={() => setLang('en')}
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider transition-all ${lang === 'en' ? 'bg-primary text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('es')}
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider transition-all ${lang === 'es' ? 'bg-primary text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
            >
              ES
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-300 font-body">
          {t.descGroup}
          <span className="font-bold text-neutral-100">{t.descGroupBold}</span>
          {t.descGroupPost}
          {t.descKnockout}
          <span className="font-bold text-neutral-100">{t.descKnockoutBold}</span>
          {t.descKnockoutPost}
        </p>
      </div>

      <div className="px-4 pt-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 font-body">
          {t.sectionGroup}
        </h3>
        <div className="mt-1">
          <Row label={t.groupRow.label} sub={t.groupRow.sub} pts={GROUP_POINTS} />
        </div>
      </div>

      <div className="px-4 pt-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 font-body">
          {t.sectionAdvances}
        </h3>
        <div className="mt-1">
          {t.rows.map((row, i) => (
            <Row key={i} label={row.label} sub={row.sub} pts={ROUND_PTS[i]} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 font-body">
          {t.sectionBonuses}
        </h3>
        <div className="mt-1">
          {t.bonuses.map((row, i) => (
            <Row key={i} label={row.label} sub={row.sub} pts={BONUS_PTS[i]} highlight />
          ))}
        </div>
      </div>
    </section>
  );
}
