'use client';

import { TabId } from '@/types';

interface StepperBarProps {
  groupCount: number;
  knockoutCount: number;
  tiesResolved: boolean;
  thirdPlacePickCount: number;
  thirdPlaceSlotsToFill: number;
  hasChampion: boolean;
  isSubmitted: boolean;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

interface Step {
  label: string;
  icon: string;
  action: 'groups' | 'thirdplace' | 'bracket' | 'submit';
}

const steps: Step[] = [
  { label: 'Groups', icon: 'grid_view', action: 'groups' },
  { label: '3rd Place', icon: 'swap_vert', action: 'thirdplace' },
  { label: 'Bracket', icon: 'account_tree', action: 'bracket' },
  { label: 'Submit', icon: 'send', action: 'submit' },
];

export default function StepperBar({ groupCount, knockoutCount, tiesResolved, thirdPlacePickCount, thirdPlaceSlotsToFill, hasChampion, isSubmitted, activeTab, onNavigate }: StepperBarProps) {
  const groupsDone = groupCount >= 72;

  const getStepStatus = (idx: number): 'completed' | 'active' | 'future' => {
    // Groups
    if (idx === 0) {
      if (groupsDone) return 'completed';
      if (activeTab === 'groups' || groupCount > 0) return 'active';
      return 'future';
    }
    // 3rd Place
    if (idx === 1) {
      if (tiesResolved) return 'completed';
      if (groupsDone) return 'active';
      return 'future';
    }
    // Bracket
    if (idx === 2) {
      if (hasChampion) return 'completed';
      if (tiesResolved && (activeTab === 'bracket' || knockoutCount > 0)) return 'active';
      return 'future';
    }
    // Submit
    if (idx === 3) {
      if (isSubmitted) return 'completed';
      if (hasChampion) return 'active';
      return 'future';
    }
    return 'future';
  };

  const getProgress = (idx: number): string => {
    if (idx === 0) return `${groupCount}/72`;
    if (idx === 1 && thirdPlaceSlotsToFill > 0) return `${thirdPlacePickCount}/${thirdPlaceSlotsToFill}`;
    if (idx === 2) return `${knockoutCount}/32`;
    return '';
  };

  const handleStepClick = (step: Step, status: 'completed' | 'active' | 'future') => {
    if (status === 'future') return;
    onNavigate(step.action as TabId);
  };

  return (
    <div className="flex items-center px-1 py-3">
      {steps.map((step, i) => {
        const status = getStepStatus(i);
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isFuture = status === 'future';
        const progress = getProgress(i);

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Step */}
            <button
              onClick={() => handleStepClick(step, status)}
              disabled={isFuture}
              className={`flex flex-col items-center gap-0.5 min-w-[40px] ${isFuture ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-primary text-black'
                  : isActive
                    ? 'ring-[1.5px] ring-primary/70 text-primary bg-primary/10'
                    : 'bg-white/[0.06] text-neutral-600'
              }`}>
                <span className={`material-symbols-outlined text-[14px] ${isCompleted ? 'font-variation-fill' : ''}`}>
                  {isCompleted ? 'check' : step.icon}
                </span>
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider leading-tight text-center ${
                isCompleted ? 'text-primary/80' : isActive ? 'text-neutral-300' : 'text-neutral-600'
              }`}>
                {step.label}
              </span>
              <span className={`text-[8px] font-semibold tabular-nums leading-tight h-[10px] ${
                isCompleted ? 'text-primary/50' : isActive ? 'text-neutral-500' : 'text-neutral-700'
              }`}>
                {progress}
              </span>
            </button>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-0.5 ${isCompleted ? 'bg-primary/30' : 'bg-white/[0.06]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
