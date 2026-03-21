import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Settings, X } from "lucide-react-native";

import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import { triggerHaptic } from "../../lib/haptics";
import { formatRewardCountdown } from "../../lib/rewards";

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  serviceParam: string;
};

type MeResponse = {
  credits?: number;
  plan?: string;
  lastRewardDate?: number;
};

const SERVICES: ServiceCardData[] = [
  {
    id: "media-room",
    title: "Media Room Masterpiece",
    subtitle: "OLED media wall with warm wood slats and cinematic glow.",
    video: require("../../assets/videos/media-wall.mp4"),
    serviceParam: "interior",
  },
  {
    id: "facade",
    title: "Architectural Facade",
    subtitle: "Modern limestone facade with bold black frames.",
    video: require("../../assets/videos/facade.mp4"),
    serviceParam: "facade",
  },
  {
    id: "garden",
    title: "Designer Sanctuary",
    subtitle: "Backyard oasis with deck, fire pit, and lounge styling.",
    video: require("../../assets/videos/garden.mp4"),
    serviceParam: "garden",
  },
  {
    id: "floor",
    title: "Instant Floor Restyle",
    subtitle: "Hardwood morphs from tile to deep walnut luxury.",
    video: require("../../assets/videos/floor.mp4"),
    serviceParam: "floor",
  },
  {
    id: "paint",
    title: "Smart Wall Paint",
    subtitle: "Walls shift to bold sage and terracotta palettes.",
    video: require("../../assets/videos/paint.mp4"),
    serviceParam: "paint",
  },
  {
    id: "bedroom",
    title: "Interior Redesign",
    subtitle: "Luxury suite glow-up with hotel-grade finish.",
    video: require("../../assets/videos/master-suite.mp4"),
    serviceParam: "interior-bedroom",
  },
];

function LoadingRow({ message }: { message: string }) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color="#f8fafc" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const diagnostic = DIAGNOSTIC_BYPASS;

  const me = useQuery(
    "users:me" as any,
    diagnostic ? "skip" : isSignedIn ? {} : "skip",
  ) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const resetScrollPosition = useCallback(() => {
    const recreate = setTimeout(() => {
      setScrollResetKey((value) => value + 1);
    }, 120);
    const first = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 1, animated: false });
    }, 220);
    const second = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 380);
    return () => {
      clearTimeout(recreate);
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  useEffect(() => {
    console.log("[Screen] Home mounted");
    const dispose = resetScrollPosition();
    return () => {
      dispose();
      console.log("[Screen] Home unmounted");
    };
  }, [resetScrollPosition]);

  useFocusEffect(
    useCallback(() => resetScrollPosition(), [resetScrollPosition]),
  );

  useEffect(() => {
    if (diagnostic || !isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [diagnostic, ensureUser, isSignedIn]);

  const credits = diagnostic ? 10 : typeof me?.credits === "number" ? me.credits : 3;
  const rewardCountdown = formatRewardCountdown(me?.lastRewardDate);
  const cardHeight = useMemo(() => Math.max(180, Math.min(240, Math.round(width * 0.45))), [width]);
  const showInlineLoading = !diagnostic && isSignedIn && me === undefined;

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      triggerHaptic();
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const handleOpenSettings = useCallback(() => {
    triggerHaptic();
    router.push("/settings");
  }, [router]);

  return (
    <View style={styles.screen}>
      <ScrollView
        key={scrollResetKey}
        ref={scrollRef}
        style={styles.scroll}
        contentOffset={{ x: 0, y: 0 }}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 18, 48),
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => setIsCreditModalOpen(true)} style={({ pressed }) => [styles.creditButton, pressed ? styles.buttonPressed : null]}>
            <Diamond color="#ffffff" size={16} />
            <Text style={styles.creditValue}>{credits}</Text>
          </Pressable>
          <Pressable onPress={handleOpenSettings} style={({ pressed }) => [styles.iconButton, pressed ? styles.buttonPressed : null]}>
            <Settings color="#ffffff" size={18} />
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>Darkor.ai Tools</Text>
        <Text style={styles.title}>Choose a redesign flow</Text>
        <Text style={styles.subtitle}>Pick a redesign path to open the wizard and start generating.</Text>

        {showInlineLoading ? <LoadingRow message="Loading your account data..." /> : null}

        <View style={styles.cardList}>
          {SERVICES.map((item) => (
            <View key={item.id} style={[styles.card, { minHeight: cardHeight }]}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.subtitle}</Text>
              <Pressable onPress={() => handleServicePress(item)} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}>
                <Text style={styles.primaryButtonText}>Open wizard</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={isCreditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreditModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable onPress={() => setIsCreditModalOpen(false)} style={({ pressed }) => [styles.modalClose, pressed ? styles.buttonPressed : null]}>
              <X color="#f4f4f5" size={16} />
            </Pressable>
            <Text style={styles.modalTitle}>Daily Credit Limit</Text>
            <Text style={styles.modalText}>
              Every account receives a set amount of daily credits. When credits run out, users can wait for the daily
              reset or upgrade later.
            </Text>
            <Text style={styles.modalHint}>{rewardCountdown}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070707",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#070707",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  creditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#121212",
  },
  iconButton: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#121212",
  },
  creditValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  eyebrow: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: "#c4c4c5",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  loadingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#d4d4d8",
    fontSize: 13,
  },
  cardList: {
    marginTop: 20,
    gap: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111111",
    padding: 18,
    justifyContent: "space-between",
  },
  cardAccent: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#60a5fa",
    marginBottom: 14,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  cardBody: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 18,
  },
  primaryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
  },
  modalClose: {
    position: "absolute",
    top: 14,
    right: 14,
    height: 30,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  modalText: {
    marginTop: 12,
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 21,
  },
  modalHint: {
    marginTop: 12,
    color: "#9ca3af",
    fontSize: 12,
  },
});

