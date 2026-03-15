import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeDiagnostic() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>Darkor.ai</Text>
          <Text style={styles.badge}>Diagnostics Mode</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Home Screen OK</Text>
          <Text style={styles.body}>
            This view renders using only React Native primitives.
          </Text>
          <Pressable style={styles.button} onPress={() => router.push("/workspace")}>
            <Text style={styles.buttonText}>Open Workspace</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brand: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  badge: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: "#cbd5f5",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#22d3ee",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
});
