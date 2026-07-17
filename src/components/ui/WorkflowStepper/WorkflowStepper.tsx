import React from 'react';
import { CheckCircle2, Clock, Send, ShieldCheck, Award, Globe, AlertTriangle } from 'lucide-react';

interface WorkflowStepperProps {
  currentStatus: string;
  submittedByRole?: string | null;
}

interface StepConfig {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  statuses: string[];  // proposal statuses that map to this step being "active" or "done"
}

const WORKFLOW_STEPS: StepConfig[] = [
  {
    key: 'pipeline',
    label: 'AI Pipeline',
    sublabel: 'Spec Analysis & Generation',
    icon: <Clock size={14} />,
    statuses: ['Ingesting', 'Analyzing', 'Designing', 'Planning', 'Assembling', 'Complete'],
  },
  {
    key: 'draft',
    label: 'Pre-Sales Draft',
    sublabel: 'Solution Blueprint Review',
    icon: <Send size={14} />,
    statuses: ['Draft'],
  },
  {
    key: 'delivery',
    label: 'Delivery Review',
    sublabel: 'Feasibility & Resource Check',
    icon: <CheckCircle2 size={14} />,
    statuses: ['DeliveryReview'],
  },
  {
    key: 'partner',
    label: 'Partner Review',
    sublabel: 'Quality & Final Sign-off',
    icon: <ShieldCheck size={14} />,
    statuses: ['PartnerReview'],
  },
  {
    key: 'approved',
    label: 'Approved',
    sublabel: 'Partner Signed',
    icon: <Award size={14} />,
    statuses: ['Approved'],
  },
  {
    key: 'published',
    label: 'Published',
    sublabel: 'Client-Ready',
    icon: <Globe size={14} />,
    statuses: ['Published'],
  },
];

// Status ordering for "done" detection
const STATUS_ORDER = [
  'Ingesting', 'Analyzing', 'Designing', 'Planning', 'Assembling', 'Complete',
  'Draft', 'DeliveryReview', 'PartnerReview', 'Approved', 'Published',
];

function getStepState(
  step: StepConfig,
  currentStatus: string
): 'done' | 'active' | 'pending' | 'rejected' {
  // Rejected state: PartnerReview → Draft means "Draft after rejection"
  if (currentStatus === 'Draft' && step.key === 'draft') return 'active';

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  if (step.statuses.includes(currentStatus)) {
    // When proposal reaches Published, show the final step as done (green)
    if (currentStatus === 'Published' && step.key === 'published') return 'done';
    return 'active';
  }

  // Check if any of the step's statuses come before current status in the order
  const stepMaxIdx = Math.max(...step.statuses.map((s) => STATUS_ORDER.indexOf(s)));
  if (stepMaxIdx < currentIdx) return 'done';

  return 'pending';
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStatus,
  submittedByRole,
}) => {
  // Only show the business workflow stepper when AI pipeline is done
  const aiStatuses = ['Ingesting', 'Analyzing', 'Designing', 'Planning', 'Assembling', 'Failed'];
  if (aiStatuses.includes(currentStatus)) return null;

  const isRejected = currentStatus === 'Draft' && submittedByRole === 'partner';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
          Business Review Workflow
        </span>
        {isRejected && (
          <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertTriangle size={12} />
            Rejected — Revision Required
          </div>
        )}
      </div>

      <div className="relative flex items-start gap-0">
        {WORKFLOW_STEPS.map((step, idx) => {
          const state = getStepState(step, currentStatus);
          const isLast = idx === WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start flex-1 min-w-0">
              {/* Step node + label */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                {/* Circle */}
                <div
                  className={`
                    h-8 w-8 rounded-full border-2 flex items-center justify-center flex-0 transition-all duration-300 z-10
                    ${state === 'done'    ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30 shadow-md' : ''}
                    ${state === 'active' && !isRejected ? 'bg-primary border-primary text-primary-foreground shadow-primary/30 shadow-md animate-pulse' : ''}
                    ${state === 'active' && isRejected  ? 'bg-rose-500 border-rose-500 text-white shadow-rose-500/30 shadow-md' : ''}
                    ${state === 'pending' ? 'bg-muted border-border text-muted-foreground' : ''}
                  `}
                >
                  {state === 'done' ? <CheckCircle2 size={14} /> : step.icon}
                </div>

                {/* Label */}
                <div className="flex flex-col items-center gap-0 text-center">
                  <span
                    className={`text-[10px] font-bold leading-tight transition-colors ${
                      state === 'done'    ? 'text-emerald-600 dark:text-emerald-400' :
                      state === 'active' && !isRejected ? 'text-primary' :
                      state === 'active' && isRejected  ? 'text-rose-500' :
                      'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-tight hidden sm:block">
                    {step.sublabel}
                  </span>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-0 w-full max-w-[32px] mt-4 relative">
                  <div
                    className={`h-0.5 w-full transition-colors duration-500 ${
                      getStepState(WORKFLOW_STEPS[idx + 1], currentStatus) !== 'pending' || state === 'done'
                        ? 'bg-emerald-500'
                        : 'bg-border'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
