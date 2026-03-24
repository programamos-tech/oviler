/** Una vez por pestaña/sesión y por organización (evita que otra cuenta en la misma pestaña bloquee el modal). */
const SESSION_PREFIX = "nou_trial_welcome_ok_";

export function trialWelcomeDismissedKey(organizationId: string): string {
  return `${SESSION_PREFIX}${organizationId}`;
}

export function isTrialWelcomeDismissedThisSession(organizationId: string | null | undefined): boolean {
  if (!organizationId || typeof window === "undefined") return false;
  return sessionStorage.getItem(trialWelcomeDismissedKey(organizationId)) === "1";
}

export function markTrialWelcomeDismissedThisSession(organizationId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(trialWelcomeDismissedKey(organizationId), "1");
}
