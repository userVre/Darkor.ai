import "react-native-gesture-handler";
import "react-native-reanimated";
import "../lib/nativewind";
import "../global.css";

import { useCallback, useEffect, useState } from "react";
import { DevSettings, Pressable, ScrollView, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { ErrorBoundary } from "../components/error-boundary";
import RootLayoutFull from "./_layout_full";
import RootLayoutDiagnostic from "./_layout_diagnostic";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";

console.log("[Boot] Root entry module loaded");
void SplashScreen.preventAutoHideAsync();

type FatalError = {
  message: string;
  stack?: string;
};

function FatalErrorScreen({ error, onReload }: { error: FatalError; onReload: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingHorizontal: 24, paddingTop: 80 }}>
      <Text style={{ color: "#f8fafc", fontSize: 20, fontWeight: "700" }}>Something went wrong</Text>
      <Text style={{ marginTop: 8, color: "#a1a1aa", fontSize: 13 }}>
        A fatal error stopped the app from rendering. Check the stack trace below.
      </Text>
      <View
        style={{
          marginTop: 18,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.05)",
          padding: 16,
        }}
      >
        <Text style={{ color: "#f4f4f5", fontSize: 14, fontWeight: "600" }}>{error.message}</Text>
        {error.stack ? (
          <ScrollView style={{ marginTop: 10, maxHeight: 220 }}>
            <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>{error.stack}</Text>
          </ScrollView>
        ) : null}
      </View>
      <Pressable
        onPress={onReload}
        style={{
          marginTop: 18,
          alignSelf: "flex-start",
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.2)",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: "#e2e8f0", fontWeight: "600", fontSize: 13 }}>Reload app</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fatalError, setFatalError] = useState<FatalError | null>(null);

  useEffect(() => {
    console.log("LOG_STAGE_1: Layout mounting");
    console.log("LOG_STAGE_2: Root loaded");
  }, []);

  useEffect(() => {
    const ErrorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => unknown; setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;
    if (!ErrorUtils?.setGlobalHandler) return;

    const previousHandler = ErrorUtils.getGlobalHandler?.();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error("[Fatal] Unhandled exception", error);
      setFatalError({ message, stack });

      if (typeof previousHandler === "function") {
        try {
          previousHandler(error, isFatal);
        } catch (handlerError) {
          console.warn("[Fatal] Global handler failed", handlerError);
        }
      }
    });

    return () => {
      if (typeof previousHandler === "function" && ErrorUtils.setGlobalHandler) {
        ErrorUtils.setGlobalHandler(previousHandler as (error: unknown, isFatal?: boolean) => void);
      }
    };
  }, []);

  const handleReload = useCallback(async () => {
    try {
      const updates = await import("expo-updates");
      if (updates?.reloadAsync) {
        await updates.reloadAsync();
        return;
      }
    } catch (error) {
      console.warn("[Fatal] Reload failed", error);
    }
    DevSettings.reload();
  }, []);

  const LayoutComponent = DIAGNOSTIC_BYPASS ? RootLayoutDiagnostic : RootLayoutFull;

  if (fatalError) {
    return <FatalErrorScreen error={fatalError} onReload={handleReload} />;
  }

  try {
    return (
      <ErrorBoundary>
        <LayoutComponent />
      </ErrorBoundary>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[Fatal] Render error", error);
    return <FatalErrorScreen error={{ message, stack }} onReload={handleReload} />;
  }
}
