import { Redirect } from "expo-router";

export default function Index() {
  console.log("APP IS RUNNING");
  return <Redirect href="/(tabs)" />;
}
