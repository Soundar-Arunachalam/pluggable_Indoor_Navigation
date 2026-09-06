import React, { useState } from 'react';
import { RouteResponse, Level } from '../../types/client';
import { 
  Navigation, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CornerUpLeft, 
  CornerUpRight, 
  Layers, 
  Footprints, 
  CheckCircle2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  Accessibility,
  ArrowRightCircle
} from 'lucide-react';

interface RouteGuidanceHUDProps {
  route: RouteResponse;
  activeLevel: Level | null;
  onClearRoute: () => void;
  onJumpToLevel: (levelId: string) => void;
}

export const RouteGuidanceHUD: React.FC<RouteGuidanceHUDProps> = ({
  route,
  activeLevel,
  onClearRoute,
  onJumpToLevel
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = route.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  const getStepIcon = (direction: string) => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'right': return <ArrowRight className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'slight_left': return <CornerUpLeft className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'slight_right': return <CornerUpRight className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'elevator_up':
      case 'elevator_down': return <Layers className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'stairs_up':
      case 'stairs_down': return <Footprints className="w-5 h-5 text-amber-600 stroke-[2.5]" />;
      case 'arrive': return <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />;
      default: return <ArrowUp className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
    }
  };

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-none">
      {/* Primary Turn-by-Turn Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 pointer-events-auto flex flex-col gap-3 text-slate-900 animate-in slide-in-from-top-3 duration-150">
        <div className="flex items-center justify-between gap-3">
          {/* Direction Icon & Current Instruction */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              {getStepIcon(currentStep.direction)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {currentStep.instruction}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{currentStep.detail || `Step ${currentStep.stepIndex + 1} of ${steps.length}`}</span>
                {currentStep.distanceMeters > 0 && (
                  <span className="text-blue-700 font-semibold">• {currentStep.distanceMeters} meters</span>
                )}
              </p>
            </div>
          </div>

          {/* Close Route */}
          <button
            onClick={onClearRoute}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            title="End Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Transition Alert Banner if next step transitions floor */}
        {currentStep.isLevelTransition && (
          <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-900 font-semibold">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Floor Change: {currentStep.fromLevelName} → {currentStep.toLevelName}</span>
            </div>
            <button
              onClick={() => onJumpToLevel(currentStep.toLevelId)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase transition shadow-sm"
            >
              View Floor
            </button>
          </div>
        )}

        {/* Stats Row & Step Switchers */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3.5 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>{route.totalDistanceMeters} m</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>~{Math.ceil(route.totalDurationSeconds / 60)} min</span>
            </div>
            {route.accessible && (
              <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <Accessibility className="w-3 h-3" />
                <span>ADA</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Previous Step */}
            <button
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold"
            >
              Prev
            </button>
            {/* Next Step */}
            <button
              disabled={currentStepIndex === steps.length - 1}
              onClick={() => setCurrentStepIndex(i => Math.min(steps.length - 1, i + 1))}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold shadow-sm"
            >
              Next
            </button>
            {/* Expand list */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Full Route Step-by-Step List */}
        {isExpanded && (
          <div className="mt-2 max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-150">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    if (step.fromLevelId !== activeLevel?.id) {
                      onJumpToLevel(step.fromLevelId);
                    }
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between text-xs border ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0">{getStepIcon(step.direction)}</div>
                    <div>
                      <p className="leading-snug">{step.instruction}</p>
                      <p className="text-[10px] text-slate-500">{step.fromLevelName}</p>
                    </div>
                  </div>
                  {step.distanceMeters > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">{step.distanceMeters}m</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
