import { type ReactNode } from "react";

import { StickyStepHeader } from "./sticky-step-header";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  creditCount?: number;
  horizontalInset?: number;
  canGoBack?: boolean;
  leftAccessory?: ReactNode;
  onBack?: () => void;
  onClose: () => void;
};

export function ServiceWizardHeader({
  title: _title,
  step,
  totalSteps = 4,
  creditCount,
  horizontalInset = 20,
  canGoBack = false,
  leftAccessory: _leftAccessory,
  onBack,
  onClose,
}: ServiceWizardHeaderProps) {
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showBack = safeStep > 1 && canGoBack && Boolean(onBack);

  return (
    <StickyStepHeader
      creditCount={creditCount}
      horizontalInset={horizontalInset}
      onBack={showBack ? onBack : undefined}
      onClose={onClose}
      step={safeStep}
      totalSteps={totalSteps}
      title={_title}
    />
  );
}
