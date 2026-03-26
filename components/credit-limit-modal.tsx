import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatePresence, MotiView } from "moti";
import { Gem, X } from "lucide-react-native";
import { memo, useCallback } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
                  glowColor="rgba(255,255,255,0.08)"
                  scale={0.94}
                >
                  <X color="#f4f4f5" size={16} strokeWidth={2.3} />
                </LuxPressable>

                <MotiView
                  from={{ scale: 0.95, opacity: 0.7 }}
                  animate={{ scale: 1.06, opacity: 1 }}
                  transition={{ type: "timing", duration: 1100, loop: true }}
                  style={styles.iconShell}
                >
                  <LinearGradient
                    colors={["rgba(245,208,254,0.98)", "rgba(217,70,239,0.92)", "rgba(79,70,229,0.9)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Gem color="#100314" size={34} strokeWidth={2.2} />
                  </LinearGradient>
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
                  glowColor="rgba(217,70,239,0.24)"
                  scale={0.988}
                >
                  <LinearGradient
                    colors={["#f5d0fe", "#d946ef", "#4f46e5"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>Upgrade to Pro</Text>
                  </LinearGradient>
                </LuxPressable>
              </View>
            </MotiView>
          ) : null}
        </AnimatePresence>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    ...surfaceCard("rgba(13,14,18,0.94)"),
    ...glowShadow("rgba(0,0,0,0.42)", 32),
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
    boxShadow: "0px 0px 32px rgba(168,85,247,0.12)",
  },
  iconGradient: {
    width: 92,
    height: 92,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
    textAlign: "center",
  },
  description: {
    marginTop: DS.spacing[1],
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    textAlign: "center",
  },
  ctaOuter: {
    width: "100%",
    marginTop: DS.spacing[2],
    borderRadius: DS.radius.md,
    overflow: "hidden",
  },
  ctaGradient: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DS.spacing[3],
    borderRadius: DS.radius.md,
  },
  ctaText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
});
