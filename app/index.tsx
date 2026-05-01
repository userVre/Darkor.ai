import {useAuth} from "@clerk/expo";
import {Redirect} from "expo-router";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Text, View} from "react-native";
import {spacing} from "../styles/spacing";

import {useViewerSession} from "../components/viewer-session-context";
import {DIAGNOSTIC_BYPASS} from "../lib/diagnostics";

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
  const { isLoaded } = useAuth();
  const { isReady: viewerReady } = useViewerSession();

  if (DIAGNOSTIC_BYPASS) {
    return <Redirect href="/(tabs)" />;
  }

  if (!isLoaded || !viewerReady) {
    return <LaunchScreen message={t("boot.checkingPlan")} />;
  }

  return <Redirect href="/(tabs)" />;
}

