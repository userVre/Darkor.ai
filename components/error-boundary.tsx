import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] Unhandled error", error, info);
  }

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
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
