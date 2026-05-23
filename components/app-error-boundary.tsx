import {Component, type ErrorInfo, type ReactNode} from "react";
import {View} from "react-native";
import {Button, Surface, Text} from "react-native-paper";

import {md3Shapes, md3Spacing, getMd3Theme} from "../constants/md3Theme";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

const fallbackTheme = getMd3Theme("light");

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({error: null});
  };

  render() {
    if (this.state.error) {
      return (
        <View style={{flex: 1, backgroundColor: fallbackTheme.colors.background, justifyContent: "center", paddingHorizontal: md3Spacing.extraLarge}}>
          <Surface elevation={1} style={{borderRadius: md3Shapes.large, backgroundColor: fallbackTheme.colors.surface, padding: md3Spacing.extraLarge}}>
            <Text selectable variant="headlineSmall" style={{color: fallbackTheme.colors.onSurface}}>
              Something went wrong
            </Text>
            <Text selectable variant="bodyMedium" style={{color: fallbackTheme.colors.onSurfaceVariant, marginTop: md3Spacing.small}}>
              HomeDecor AI caught a startup problem. Please try again.
            </Text>
            <Text selectable variant="bodySmall" style={{color: fallbackTheme.colors.error, marginTop: md3Spacing.medium}}>
              {this.state.error.message}
            </Text>
            <Button mode="contained" onPress={this.handleRetry} style={{marginTop: md3Spacing.large}}>
              Retry
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}
