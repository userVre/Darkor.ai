let launchPaywallDismissed = false;

export function hasDismissedLaunchPaywall() {
  return launchPaywallDismissed;
}

export function dismissLaunchPaywall() {
  launchPaywallDismissed = true;
}

export function resetLaunchPaywall() {
  launchPaywallDismissed = false;
}

