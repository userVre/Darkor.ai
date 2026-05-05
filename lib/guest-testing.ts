// Guests start empty; the dashboard claim bar grants the first daily diamond.
export const ENABLE_GUEST_WIZARD_TEST_MODE = true;
export const GUEST_TESTING_STARTER_CREDITS = 0;
export const GUEST_TESTING_TEMP_ID = "temp_guest_id";

export function isGuestWizardTestingSession(isSignedIn: boolean | null | undefined) {
  return ENABLE_GUEST_WIZARD_TEST_MODE && !Boolean(isSignedIn);
}

export function resolveGuestWizardViewerId(
  anonymousId: string | null | undefined,
  isSignedIn: boolean | null | undefined,
) {
  if (Boolean(isSignedIn)) {
    return anonymousId ?? null;
  }

  return anonymousId ?? GUEST_TESTING_TEMP_ID;
}
