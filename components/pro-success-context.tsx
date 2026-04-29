import {Check, Sparkles} from "@/components/material-icons";
import * as Haptics from "expo-haptics";
import {LinearGradient} from "expo-linear-gradient";
import {MotiView} from "moti";
import {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useRef,
useState,
} from "react";
import {useTranslation} from "react-i18next";
import {Platform, Text, ToastAndroid, View, useWindowDimensions} from "react-native";
import {Easing} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {spacing} from "../styles/spacing";

import {DS} from "../lib/design-system";
import {LUX_SPRING} from "../lib/motion";
import {fonts} from "../styles/typography";
import {LuxPressable} from "./lux-pressable";

type ProSuccessContextValue = {
  showSuccess: () => void;
  showToast: (message: string) => void;
  showCelebration: (message: string) => void;
};

const ProSuccessContext = createContext<ProSuccessContextValue | null>(null);

function ProSuccessOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black px-6">
      <MotiView
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={LUX_SPRING}
        className="w-full"
      >
        <MotiView
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ ...LUX_SPRING, loop: true }}
          className="rounded-[32px]"
          style={{
            shadowColor: DS.colors.accentStrong,
            shadowOpacity: 0.28,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 12 },
            elevation: 16,
          }}
        >
          <LinearGradient
            colors={[DS.colors.accentStrong, DS.colors.positive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: spacing.xs }}
          >
            <View className="rounded-[30px] border border-white/10 bg-black px-6 py-8" style={{ borderWidth: 0.5 }}>
              <View className="flex-row items-center gap-2">
                <Sparkles color={DS.colors.textInverse} size={20} />
                <Text className="text-xl font-medium text-white" style={fonts.medium}>{t("proSuccess.title")} {"\u2728"}</Text>
              </View>
              <Text className="mt-3 text-sm text-zinc-400">{t("proSuccess.subtitle")}</Text>

              <View className="mt-5 gap-3">
                {[
                  t("proSuccess.features.hyperRealism"),
                  t("proSuccess.features.virtualStaging"),
                  t("proSuccess.features.infiniteCredits"),
                ].map((item) => (
                  <View key={item} className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      <Check color={DS.colors.textInverse} size={16} />
                    </View>
                    <Text className="text-sm font-semibold text-zinc-100" style={fonts.semibold}>{item}</Text>
                  </View>
                ))}
              </View>

              <LuxPressable onPress={onClose} className="mt-8 overflow-hidden rounded-2xl">
                <LinearGradient
                  colors={[DS.colors.accent, DS.colors.accentStrong]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: spacing.md, alignItems: "center", borderRadius: 18 }}
                >
                  <Text className="text-sm font-semibold text-white" style={fonts.semibold}>{t("proSuccess.cta")}</Text>
                </LinearGradient>
              </LuxPressable>
            </View>
          </LinearGradient>
        </MotiView>
      </MotiView>
    </View>
  );
}

const BASE_SPARKLES = Array.from({ length: 18 }).map((_, index) => {
  const offset = index * 37;
  const xRatio = ((offset * 13) % 100) / 100;
  const yRatio = ((offset * 17) % 100) / 100;
  const size = 10 + ((offset * 7) % 16);
  const delay = (offset * 23) % 900;
  const duration = 1600 + ((offset * 11) % 1400);
  return { id: `sparkle-${index}`, xRatio, yRatio, size, delay, duration };
});

function SparkleCelebration({ visible }: { visible: boolean }) {
  const { width, height } = useWindowDimensions();
  const sparkles = useMemo(
    () =>
      BASE_SPARKLES.map((sparkle) => ({
        ...sparkle,
        x: sparkle.xRatio * Math.max(0, width - sparkle.size),
        y: sparkle.yRatio * Math.max(0, height - sparkle.size),
      })),
    [width, height],
  );
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-40" pointerEvents="none">
      {sparkles.map((sparkle) => (
        <MotiView
          key={sparkle.id}
          from={{ opacity: 0, translateY: 12, scale: 0.6, rotate: "0deg" }}
          animate={{ opacity: [0, 1, 0], translateY: -48, scale: [0.6, 1, 0.5], rotate: "12deg" }}
          transition={{
            type: "timing",
            delay: sparkle.delay,
            duration: sparkle.duration,
            easing: Easing.out(Easing.cubic),
          }}
          style={{
            position: "absolute",
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: sparkle.size,
              backgroundColor: DS.colors.accentGlowStrong,
              shadowColor: DS.colors.accent,
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          />
        </MotiView>
      ))}
    </View>
  );
}

function ProToast({
  message,
  onHide,
}: {
  message: string;
  onHide: () => void;
}) {
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    timeoutRef.current = setTimeout(onHide, 2200);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [message, onHide]);

  if (!message) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={LUX_SPRING}
      className="absolute left-6 right-6 z-50"
      style={{ top: insets.top + 8 }}
      pointerEvents="none"
    >
      <View className="rounded-2xl border border-white/10 bg-black/80 px-4 py-3" style={{ borderWidth: 0.5 }}>
        <Text className="text-center text-sm font-semibold text-white" style={fonts.semibold}>{message}</Text>
      </View>
    </MotiView>
  );
}

export function ProSuccessProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [showOverlay, setShowOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showSparkles, setShowSparkles] = useState(false);
  const sparkleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    setToastMessage(message);
  }, []);

  const showSuccess = useCallback(() => {
    setShowOverlay(true);
    setShowSparkles(true);
    showToast(t("proSuccess.toast"));
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [showToast, t]);

  const showCelebration = useCallback((message: string) => {
    setShowSparkles(true);
    showToast(message);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [showToast]);

  useEffect(() => {
    if (!showSparkles) return;
    if (sparkleTimeout.current) {
      clearTimeout(sparkleTimeout.current);
    }
    sparkleTimeout.current = setTimeout(() => setShowSparkles(false), 3200);
    return () => {
      if (sparkleTimeout.current) {
        clearTimeout(sparkleTimeout.current);
        sparkleTimeout.current = null;
      }
    };
  }, [showSparkles]);

  const value = useMemo(
    () => ({
      showSuccess,
      showToast,
      showCelebration,
    }),
    [showCelebration, showSuccess, showToast],
  );

  return (
    <ProSuccessContext.Provider value={value}>
      {children}
      <SparkleCelebration visible={showSparkles} />
      <ProSuccessOverlay visible={showOverlay} onClose={() => setShowOverlay(false)} />
      {toastMessage ? <ProToast message={toastMessage} onHide={() => setToastMessage("")} /> : null}
    </ProSuccessContext.Provider>
  );
}

export function useProSuccess() {
  const context = useContext(ProSuccessContext);
  if (!context) {
    throw new Error("useProSuccess must be used within ProSuccessProvider");
  }
  return context;
}

