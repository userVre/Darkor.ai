import {Component, type ErrorInfo, type ReactNode} from "react";
import {Text, View} from "react-native";
import {spacing} from "../styles/spacing";

import {LuxPressable} from "./lux-pressable";

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
        <View style={{ flex: 1, backgroundColor: "#000000", justifyContent: "center", paddingHorizontal: spacing.lg }}>
          <View style={{ borderRadius: 28, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#09090b", padding: spacing.lg }}>
            <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "600" }}>We hit a render issue.</Text>
            <Text style={{ color: "#a1a1aa", fontSize: 14, marginTop: spacing.sm, lineHeight: 22 }}>
              HomeDecor AI caught the error before it turned into a blank screen. Retry the interface and keep going.
            </Text>
            <Text style={{ color: "#71717a", fontSize: 12, marginTop: spacing.md }}>{this.state.error.message}</Text>
            <LuxPressable onPress={this.handleRetry} className="mt-6 overflow-hidden rounded-2xl">
              <View style={{ backgroundColor: "#ffffff", borderRadius: 18, paddingVertical: spacing.md, alignItems: "center" }}>
                <Text style={{ color: "#09090b", fontSize: 14, fontWeight: "700" }}>Retry</Text>
              </View>
            </LuxPressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
