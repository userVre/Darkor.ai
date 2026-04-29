import {useQuery} from "convex/react";
import {Redirect} from "expo-router";
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Text, View} from "react-native";
import {spacing} from "../styles/spacing";

import {useViewerSession} from "../components/viewer-session-context";
import {DIAGNOSTIC_BYPASS} from "../lib/diagnostics";
import {hasDismissedLaunchPaywall} from "../lib/launch-paywall";
import {getRevenueCatClient, hasActiveSubscription} from "../lib/revenuecat";

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
  const { t } = useTranslation();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const [hasCheckedRevenueCat, setHasCheckedRevenueCat] = useState(false);
  const [revenueCatHasAccess, setRevenueCatHasAccess] = useState(false);

  const me = useQuery(
    "users:me" as any,
    DIAGNOSTIC_BYPASS ? "skip" : viewerReady ? viewerArgs : "skip",
  ) as MeResponse | null | undefined;

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS) {
      setHasCheckedRevenueCat(true);
      return;
    }

    let active = true;

    const checkRevenueCat = async () => {
      const client = getRevenueCatClient();
      if (!client) {
        if (active) {
          setHasCheckedRevenueCat(true);
        }
        return;
      }

      try {
        const info = await client.getCustomerInfo();
        if (!active) {
          return;
        }

        setRevenueCatHasAccess(hasActiveSubscription(info));
      } catch (error) {
        console.warn("[Index] RevenueCat access check failed", error);
      } finally {
        if (active) {
          setHasCheckedRevenueCat(true);
        }
      }
    };

    void checkRevenueCat();
    return () => {
      active = false;
    };
  }, []);

  if (DIAGNOSTIC_BYPASS) {
    return <Redirect href="/(tabs)" />;
  }

  if (!viewerReady || me === undefined || !hasCheckedRevenueCat) {
    return <LaunchScreen message={t("boot.checkingPlan")} />;
  }

  if (hasDismissedLaunchPaywall()) {
    return <Redirect href="/(tabs)" />;
  }

  if (Boolean(me?.hasPaidAccess) || revenueCatHasAccess) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/paywall?source=launch" />;
}

