import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Text, ToastAndroid, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Sparkles } from "lucide-react-native";

import { LUX_SPRING } from "../lib/motion";
import { LuxPressable } from "./lux-pressable";

type ProSuccessContextValue = {
  showSuccess: () => void;
  showToast: (message: string) => void;
};

const ProSuccessContext = createContext<ProSuccessContextValue | null>(null);

function ProSuccessOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
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
          style={{ boxShadow: "0 0 40px rgba(217, 70, 239, 0.45)" }}
        >
          <LinearGradient
            colors={["#d946ef", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: 2 }}
          >
            <View className="rounded-[30px] border border-white/10 bg-black px-6 py-8" style={{ borderWidth: 0.5 }}>
              <View className="flex-row items-center gap-2">
                <Sparkles color="#f5f3ff" size={20} />
                <Text className="text-xl font-medium text-white">Welcome to Darkor Pro! ✨</Text>
              </View>
              <Text className="mt-3 text-sm text-zinc-400">
                You’re fully powered up. Here’s what’s unlocked:
              </Text>

              <View className="mt-5 gap-3">
                {[
                  "8K Hyper-Realism Enabled",
                  "Virtual Staging Unlocked",
                  "Infinite Credits Active",
                ].map((item) => (
                  <View key={item} className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      <Check color="#f8fafc" size={16} />
                    </View>
                    <Text className="text-sm font-semibold text-zinc-100">{item}</Text>
                  </View>
                ))}
              </View>

              <LuxPressable onPress={onClose} className="mt-8 overflow-hidden rounded-2xl">
                <LinearGradient
                  colors={["#f43f5e", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 14, alignItems: "center", borderRadius: 18 }}
                >
                  <Text className="text-sm font-semibold text-white">Start Designing</Text>
                </LinearGradient>
              </LuxPressable>
            </View>
          </LinearGradient>
        </MotiView>
      </MotiView>
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

  if (!message) return null;

  if (!timeoutRef.current) {
    timeoutRef.current = setTimeout(onHide, 2200);
  }

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
        <Text className="text-center text-sm font-semibold text-white">{message}</Text>
      </View>
    </MotiView>
  );
}

export function ProSuccessProvider({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = useCallback((message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    setToastMessage(message);
  }, []);

  const showSuccess = useCallback(() => {
    setShowOverlay(true);
    showToast("Account Upgraded to Pro successfully.");
  }, [showToast]);

  const value = useMemo(
    () => ({
      showSuccess,
      showToast,
    }),
    [showSuccess, showToast],
  );

  return (
    <ProSuccessContext.Provider value={value}>
      {children}
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
