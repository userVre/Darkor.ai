import {type ReactNode} from "react";

import {StickyStepHeader} from "./sticky-step-header";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  showProgress?: boolean;
  creditCount?: number;
  horizontalInset?: number;
  onCreditsPress?: () => void;
  canGoBack?: boolean;
  leftAccessory?: ReactNode;
  onBack?: () => void;
  onClose: () => void;
};

export function ServiceWizardHeader({
  title: _title,
  step,
  totalSteps = 4,
  showProgress = true,
  creditCount,
  horizontalInset = 20,
  onCreditsPress,
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
      onCreditsPress={onCreditsPress}
      onBack={showBack ? onBack : undefined}
      onClose={onClose}
      step={safeStep}
      totalSteps={totalSteps}
      title={_title}
      showProgress={showProgress}
    />
  );
}
