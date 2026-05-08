import {useAuth} from "@clerk/expo";
import {Redirect} from "expo-router";

import {AuthScreen} from "@/components/auth/AuthScreen";

export default function Index() {
  const {isLoaded, isSignedIn} = useAuth();

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <AuthScreen mode="sign-in" />;
}
