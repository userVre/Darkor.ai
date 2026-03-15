import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayoutDiagnostic() {
  useEffect(() => {
    console.log("[Boot] Diagnostic root layout active");
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
