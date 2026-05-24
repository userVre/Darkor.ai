import {Eye, EyeOff} from "lucide-react-native";
import {useState, type ComponentType} from "react";
import {useTranslation} from "react-i18next";
import {StyleSheet, View, type TextInputProps as RNTextInputProps} from "react-native";
import {HelperText, TextInput as PaperTextInput, useTheme as usePaperTheme} from "react-native-paper";

import {md3Spacing} from "../../constants/md3Theme";

type IconComponent = ComponentType<{color: string; size: number; strokeWidth?: number}>;

type AuthInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon?: IconComponent;
  secureTextEntry?: boolean;
  error?: string;
  autoComplete?: RNTextInputProps["autoComplete"];
  keyboardType?: RNTextInputProps["keyboardType"];
  textContentType?: RNTextInputProps["textContentType"];
  autoCapitalize?: RNTextInputProps["autoCapitalize"];
  returnKeyType?: RNTextInputProps["returnKeyType"];
};

export function AuthInput({
  label,
  placeholder: _placeholder,
  value,
  onChangeText,
  icon: Icon,
  secureTextEntry,
  error,
  autoComplete,
  keyboardType,
  textContentType,
  autoCapitalize = "none",
  returnKeyType,
}: AuthInputProps) {
  const paperTheme = usePaperTheme();
  const {t} = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <PaperTextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        contentStyle={styles.inputContent}
        error={Boolean(error)}
        keyboardType={keyboardType}
        label={label}
        left={
          Icon ? (
            <PaperTextInput.Icon
              icon={({color, size}) => <Icon color={color} size={size} strokeWidth={1.9} />}
            />
          ) : undefined
        }
        mode="flat"
        onChangeText={onChangeText}
        returnKeyType={returnKeyType}
        right={
          isPassword ? (
            <PaperTextInput.Icon
              accessibilityLabel={passwordVisible ? t("auth.screen.fields.hidePassword") : t("auth.screen.fields.showPassword")}
              forceTextInputFocus={false}
              icon={({size}) =>
                passwordVisible ? (
                  <EyeOff color={paperTheme.colors.onSurfaceVariant} size={size} strokeWidth={1.8} />
                ) : (
                  <Eye color={paperTheme.colors.onSurfaceVariant} size={size} strokeWidth={1.8} />
                )
              }
              onPress={() => setPasswordVisible((current) => !current)}
            />
          ) : undefined
        }
        secureTextEntry={isPassword && !passwordVisible}
        selectionColor={paperTheme.colors.primary}
        style={styles.input}
        textContentType={textContentType}
        value={value}
      />
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexGrow: 0,
    flexShrink: 0,
  },
  input: {
    backgroundColor: "transparent",
  },
  inputContent: {
    minHeight: 56,
    paddingHorizontal: md3Spacing.small,
    letterSpacing: 0,
  },
});
