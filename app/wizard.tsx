import { Redirect, useLocalSearchParams } from "expo-router";

export default function WizardScreen() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/workspace", params }} />;
}
