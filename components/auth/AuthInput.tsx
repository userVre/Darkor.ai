import {Eye, EyeOff} from "lucide-react-native";
import {useState} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {useTheme} from "../../styles/theme";

const DARK_ACTION = "#111111";

type AuthInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  autoComplete?: TextInputProps["autoComplete"];
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  returnKeyType?: TextInputProps["returnKeyType"];
};

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  error,
  autoComplete,
  keyboardType,
  textContentType,
  autoCapitalize = "none",
  returnKeyType,
}: AuthInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <Text selectable style={[styles.label, {color: theme.textSecondary}]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {backgroundColor: theme.surfaceMuted, borderColor: theme.border},
          focused ? {borderColor: DARK_ACTION} : null,
          error ? {borderColor: theme.error} : null,
        ]}
      >
        <TextInput
          style={[styles.input, {color: theme.textPrimary}, isPassword ? styles.passwordInput : null]}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !passwordVisible}
          autoComplete={autoComplete}
          textContentType={textContentType}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={DARK_ACTION}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.eyeButton}
          >
            {passwordVisible ? (
              <EyeOff color={theme.textSecondary} size={20} strokeWidth={1.8} />
            ) : (
              <Eye color={theme.textSecondary} size={20} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text selectable style={[styles.error, {color: theme.error}]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0,
  },
  passwordInput: {
    paddingRight: 4,
  },
  eyeButton: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 11,
    fontWeight: "400",
    letterSpacing: 0,
  },
});
