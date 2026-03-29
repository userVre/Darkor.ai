import { BlurView } from "expo-blur";
import { AnimatePresence, MotiView } from "moti";
import { Gem, X } from "lucide-react-native";
import { memo, useCallback, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { spacing } from "../styles/spacing";
import { createButtonStyles } from "@/styles/buttons";
import { type Theme, useTheme } from "@/styles/theme";

import { LuxPressable } from "./lux-pressable";
import { DS, HAIRLINE, glowShadow, surfaceCard } from "../lib/design-system";
import { LUX_SPRING } from "../lib/motion";
import { triggerHaptic } from "../lib/haptics";

type CreditLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export const CreditLimitModal = memo(function CreditLimitModal({
  visible,
  onClose,
  onUpgrade,
}: CreditLimitModalProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handleClose = useCallback(() => {
    triggerHaptic();
    onClose();
  }, [onClose]);

  const handleUpgrade = useCallback(() => {
    triggerHaptic();
    onUpgrade();
  }, [onUpgrade]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.screen}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        <Pressable style={[styles.backdrop, { cursor: "pointer" as any }]} onPress={handleClose} />

        <AnimatePresence>
          {visible ? (
            <MotiView
              from={{ opacity: 0, scale: 0.94, translateY: 18 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.96, translateY: 10 }}
              transition={LUX_SPRING}
              style={styles.centerWrap}
            >
              <View style={styles.card}>
                <LuxPressable
                  onPress={handleClose}
                  pressableClassName="cursor-pointer"
                  className="cursor-pointer"
                  style={styles.closeButton}
                  glowColor={colors.surfaceHigh}
                  scale={0.94}
                >
                  <X color={colors.textPrimary} size={16} strokeWidth={2.3} />
                </LuxPressable>

                <MotiView
                  from={{ scale: 0.95, opacity: 0.7 }}
                  animate={{ scale: 1.06, opacity: 1 }}
                  transition={{ type: "timing", duration: 1100, loop: true }}
                  style={styles.iconShell}
                >
                  <View style={styles.iconGradient}>
                    <Gem color={colors.textPrimary} size={34} strokeWidth={2.2} />
                  </View>
                </MotiView>

                <Text style={styles.title}>Daily Credit Limit</Text>
                <Text style={styles.description}>
                  Every account receives a set amount of daily credits. To remove limits and generate more, upgrade to a
                  Pro plan instead anytime now!
                </Text>

                <LuxPressable
                  onPress={handleUpgrade}
                  pressableClassName="cursor-pointer"
                  className="cursor-pointer"
                  style={styles.ctaOuter}
                  glowColor={colors.brand}
                  scale={0.988}
                >
                  <View style={styles.ctaGradient}>
                    <Text style={styles.ctaText}>Upgrade to Pro</Text>
                  </View>
                </LuxPressable>
              </View>
            </MotiView>
          ) : null}
        </AnimatePresence>
      </View>
    </Modal>
  );
});

function createStyles(colors: Theme) {
  const buttonStyles = createButtonStyles(colors);

  return StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceOverlay,
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    ...surfaceCard(colors.surfaceHigh),
    ...glowShadow(colors.shadow, 32),
    overflow: "hidden",
    borderRadius: DS.radius.xxl,
    paddingHorizontal: DS.spacing[3],
    paddingTop: DS.spacing[3],
    paddingBottom: DS.spacing[3],
    alignItems: "center",
    gap: DS.spacing[1],
  },
  closeButton: {
    position: "absolute",
    top: DS.spacing[2],
    right: DS.spacing[2],
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
    backgroundColor: DS.colors.surfaceMuted,
  },
  iconShell: {
    marginTop: DS.spacing[1],
    marginBottom: DS.spacing[2],
    borderRadius: 999,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  iconGradient: {
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
    textAlign: "left",
  },
  description: {
    marginTop: DS.spacing[1],
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    textAlign: "left",
  },
  ctaOuter: {
    width: "100%",
    marginTop: DS.spacing[2],
    borderRadius: DS.radius.md,
    overflow: "hidden",
  },
  ctaGradient: {
    ...buttonStyles.primary,
    paddingHorizontal: DS.spacing[3],
  },
  ctaText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
  });
}
