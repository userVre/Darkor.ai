import { Component, type ReactNode } from "react";
import { DevSettings, Pressable, Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const stack = error instanceof Error ? error.stack : undefined;
    return { hasError: true, message, stack };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] Unhandled error", error, info);
    const componentStack = (info as { componentStack?: string } | null)?.componentStack;
    if (componentStack && componentStack !== this.state.stack) {
      this.setState({ stack: componentStack });
    }
  }

  handleReload = async () => {
    try {
      const updates = await import("expo-updates");
      if (updates?.reloadAsync) {
        await updates.reloadAsync();
        return;
      }
    } catch {
      // ignore, fallback to DevSettings
    }
    DevSettings.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 24,
              borderWidth: 0.5,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.05)",
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#ffffff" }}>Something went wrong</Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: "#a1a1aa" }}>
              We hit a temporary issue. Please try again.
            </Text>
            {this.state.message ? (
              <Text style={{ marginTop: 10, fontSize: 12, color: "#71717a" }}>{this.state.message}</Text>
            ) : null}
            {this.state.stack ? (
              <Text style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", lineHeight: 16 }}>
                {this.state.stack}
              </Text>
            ) : null}
            <Pressable
              onPress={() => this.setState({ hasError: false })}
              style={{
                marginTop: 20,
                alignItems: "center",
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>Try again</Text>
            </Pressable>
            <Pressable
              onPress={this.handleReload}
              style={{
                marginTop: 10,
                alignItems: "center",
                borderRadius: 16,
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.2)",
                paddingVertical: 10,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#e4e4e7" }}>Reload app</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
