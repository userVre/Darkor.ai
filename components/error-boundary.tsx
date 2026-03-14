import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";

import { LuxPressable } from "./lux-pressable";

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

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-black px-6">
          <View className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6" style={{ borderWidth: 0.5 }}>
            <Text className="text-lg font-semibold text-white">Something went wrong</Text>
            <Text className="mt-2 text-sm text-zinc-400">
              We hit a temporary issue. Please try again.
            </Text>
            <LuxPressable
              onPress={() => this.setState({ hasError: false })}
              className="mt-5 rounded-2xl bg-white/10 px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-white">Try again</Text>
            </LuxPressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
