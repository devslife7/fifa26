'use client';

import { TabId } from '@/types';
import { PredictionFlowState } from '@/lib/logic/prediction-flow';

interface StepperBarProps {
  flowState: PredictionFlowState;
  isSubmitted: boolean;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

interface Step {
  label: string;
  icon: string;
  action: 'groups' | 'thirdplace' | 'bracket' | 'submit';
}

const baseSteps: Step[] = [
  { label: 'Groups', icon: 'grid_view', action: 'groups' },
  { label: 'Bracket', icon: 'account_tree', action: 'bracket' },
  { label: 'Submit', icon: 'send', action: 'submit' },
];

export default function StepperBar({ flowState, isSubmitted, activeTab, onNavigate }: StepperBarProps) {
  const steps: Step[] = flowState.thirdPlaceRequired
    ? [
        baseSteps[0],
        { label: '3rd Place', icon: 'swap_vert', action: 'thirdplace' },
        baseSteps[1],
        baseSteps[2],
      ]
    : baseSteps;

  const getStepStatus = (step: Step): 'completed' | 'active' | 'future' => {
    // Groups
    if (step.action === 'groups') {
      if (flowState.groupsComplete) return 'completed';
      if (activeTab === 'groups' || flowState.groupCount > 0) return 'active';
      return 'future';
    }
    // 3rd Place
    if (step.action === 'thirdplace') {
      if (flowState.groupsComplete && flowState.thirdPlaceComplete) return 'completed';
      if (flowState.groupsComplete) return 'active';
      return 'future';
    }
    // Bracket
    if (step.action === 'bracket') {
      if (flowState.hasChampion) return 'completed';
      if (flowState.groupsComplete && flowState.thirdPlaceComplete && (activeTab === 'bracket' || flowState.knockoutCount > 0)) return 'active';
      return 'future';
    }
    // Submit
    if (step.action === 'submit') {
      if (isSubmitted) return 'completed';
      if (flowState.submitAvailable) return 'active';
      return 'future';
    }
    return 'future';
  };

  const getProgress = (step: Step): string => {
    if (step.action === 'groups') return flowState.groupProgressLabel;
    if (step.action === 'thirdplace') return flowState.thirdPlaceProgressLabel;
    if (step.action === 'bracket') return flowState.bracketProgressLabel;
    return '';
  };

  const handleStepClick = (step: Step, status: 'completed' | 'active' | 'future') => {
    if (status === 'future') return;
    onNavigate(step.action as TabId);
  };

  return (
    <div className="flex items-center px-1 py-3">
      {steps.map((step, i) => {
        const status = getStepStatus(step);
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isFuture = status === 'future';
        const progress = getProgress(step);

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Step */}
            <button
              onClick={() => handleStepClick(step, status)}
              disabled={isFuture}
              className={`flex flex-col items-center gap-0.5 min-w-[40px] rounded-lg px-1.5 py-1 transition-all ${
                isFuture
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-white/5 active:scale-95 transition-transform'
              }`}
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
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight text-center ${
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
