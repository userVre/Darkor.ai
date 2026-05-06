import {useNetInfo} from "@react-native-community/netinfo";
import {useMemo} from "react";

export const OFFLINE_GENERATION_TOAST = "Connexion internet requise pour générer une image.";

export function useIsOffline() {
  const netInfo = useNetInfo();

  return useMemo(() => {
    if (netInfo.isInternetReachable === false) {
      return true;
    }

    if (netInfo.isConnected === false) {
      return true;
    }

    return false;
  }, [netInfo.isConnected, netInfo.isInternetReachable]);
}
