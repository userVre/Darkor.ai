import { type ReactNode, useCallback } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showBack = safeStep > 1 && canGoBack && Boolean(onBack);
  const handleExitPress = useCallback(() => {
    Alert.alert(t("common.alerts.exitTitle"), t("common.alerts.progressLost"), [
      { text: t("common.actions.cancel"), style: "cancel" },
      { text: t("common.actions.exit"), style: "destructive", onPress: onClose },
    ]);
  }, [onClose, t]);

  return (
    <StickyStepHeader
      creditCount={creditCount}
      horizontalInset={horizontalInset}
      onBack={showBack ? onBack : undefined}
      onClose={handleExitPress}
      step={safeStep}
      totalSteps={totalSteps}
      title={_title}
    />
  );
}
