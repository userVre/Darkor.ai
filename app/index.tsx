import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { spacing } from "../styles/spacing";

import { useViewerSession } from "../components/viewer-session-context";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { hasDismissedLaunchPaywall } from "../lib/launch-paywall";

type MeResponse = {
  plan: "free" | "trial" | "pro";
  hasPaidAccess?: boolean;
};

function LaunchScreen({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        paddingHorizontal: spacing.lg,
      }}
    >
      <ActivityIndicator color="#ffffff" />
      <Text style={{ marginTop: spacing.sm, fontSize: 14, color: "#f4f4f5" }}>{message}</Text>
    </View>
  );
}

export default function Index() {
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const [gateTimedOut, setGateTimedOut] = useState(false);

  const me = useQuery(
    "users:me" as any,
    DIAGNOSTIC_BYPASS ? "skip" : viewerReady ? viewerArgs : "skip",
  ) as MeResponse | null | undefined;

  const launchPaywallDismissed = hasDismissedLaunchPaywall();

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS || gateTimedOut || (viewerReady && me !== undefined)) {
      return;
    }

    const timer = setTimeout(() => {
      console.warn("[Index] Plan lookup timed out after 2000ms. Continuing into tabs.");
      setGateTimedOut(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [gateTimedOut, me, viewerReady]);

  if (DIAGNOSTIC_BYPASS || gateTimedOut) {
    return <Redirect href="/(tabs)" />;
  }

  if (!viewerReady || me === undefined) {
    return <LaunchScreen message="Checking your plan..." />;
  }

  if ((me?.plan ?? "free") === "free" && !launchPaywallDismissed) {
    return <Redirect href="/paywall" />;
  }

  return <Redirect href="/(tabs)" />;
}

