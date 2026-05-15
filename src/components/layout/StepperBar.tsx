'use client';

import { Fragment } from 'react';
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

  const progressRatio = (() => {
    if (activeTab === 'groups') return Math.min(flowState.groupCount / 72, 1);
    if (activeTab === 'thirdplace') {
      if (flowState.thirdPlaceSlotsToFill === 0) return null;
      return Math.min(flowState.thirdPlacePickCount / flowState.thirdPlaceSlotsToFill, 1);
    }
    if (activeTab === 'bracket') return Math.min(flowState.knockoutCount / 32, 1);
    if (activeTab === 'submit') return 1;
    return null;
  })();

  return (
    <div className="relative flex items-center px-1 py-4">
      {steps.map((step, i) => {
        const status = getStepStatus(step);
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isFuture = status === 'future';
        const progress = getProgress(step);
        const prevCompleted = i > 0 && getStepStatus(steps[i - 1]) === 'completed';

        return (
          <Fragment key={step.label}>
            {/* Connector line (before each step except the first) */}
            {i > 0 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${prevCompleted ? 'bg-primary/30' : 'bg-white/[0.06]'}`} />
            )}
            {/* Step */}
            <button
              onClick={() => handleStepClick(step, status)}
              disabled={isFuture}
              className={`flex flex-col items-center gap-1 min-w-[52px] rounded-lg px-2 py-1.5 transition-all ${
                isFuture
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-white/5 active:scale-95 transition-transform'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-primary text-black'
                  : isActive
                    ? 'ring-2 ring-primary/70 text-primary bg-primary/10'
                    : 'bg-white/[0.06] text-neutral-600'
              }`}>
                <span className={`material-symbols-outlined text-[18px] ${isCompleted ? 'font-variation-fill' : ''}`}>
                  {isCompleted ? 'check' : step.icon}
                </span>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider leading-tight text-center ${
                isCompleted ? 'text-primary/80' : isActive ? 'text-neutral-200' : 'text-neutral-600'
              }`}>
                {step.label}
              </span>
              <span className={`text-[10px] font-semibold tabular-nums leading-tight h-[12px] ${
                isCompleted ? 'text-primary/50' : isActive ? 'text-neutral-400' : 'text-neutral-700'
              }`}>
                {progress}
              </span>
            </button>
          </Fragment>
        );
      })}
      {progressRatio !== null && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.04]">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
