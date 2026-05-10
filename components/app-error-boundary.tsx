import {Component, type ErrorInfo, type ReactNode} from "react";
import {Pressable, Text, View} from "react-native";
import {spacing} from "../styles/spacing";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", paddingHorizontal: spacing.lg }}>
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#ffffff", padding: spacing.lg }}>
            <Text selectable style={{ color: "#111827", fontSize: 24, fontWeight: "700" }}>Something went wrong</Text>
            <Text selectable style={{ color: "#4b5563", fontSize: 14, marginTop: spacing.sm, lineHeight: 22 }}>
              HomeDecor AI caught a startup problem. Please try again.
            </Text>
            <Text selectable style={{ color: "#6b7280", fontSize: 12, marginTop: spacing.md }}>{this.state.error.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={this.handleRetry}
              style={{ marginTop: spacing.lg, borderRadius: 18, backgroundColor: "#111827", paddingVertical: spacing.md, alignItems: "center" }}
            >
              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
