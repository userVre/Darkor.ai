import { StickyStepHeader } from "./sticky-step-header";

type DesignStepHeaderProps = {
  creditCount?: number;
  step: number;
  totalSteps: number;
  top?: number;
  horizontalInset: number;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

export function DesignStepHeader({
  creditCount,
  step,
  totalSteps,
  horizontalInset,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: DesignStepHeaderProps) {
  return (
    <StickyStepHeader
      backAccessibilityLabel={backAccessibilityLabel}
      closeAccessibilityLabel={closeAccessibilityLabel}
      creditCount={creditCount}
      horizontalInset={horizontalInset}
      onBack={onBack}
      onClose={onClose}
      step={step}
      totalSteps={totalSteps}
    />
  );
}
