import { type ReactNode, useCallback } from "react";
import { Alert } from "react-native";

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
  const handleExitPress = useCallback(() => {
    Alert.alert("Exit?", "Your progress will be lost.", [
      { text: "CANCEL", style: "cancel" },
      { text: "EXIT", style: "destructive", onPress: onClose },
    ]);
  }, [onClose]);

  return (
    <StickyStepHeader
      creditCount={creditCount}
      horizontalInset={horizontalInset}
      onBack={showBack ? onBack : undefined}
      onClose={handleExitPress}
      step={safeStep}
      totalSteps={totalSteps}
    />
  );
}
