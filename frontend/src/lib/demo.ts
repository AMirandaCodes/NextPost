/** Demo-mode builds (VITE_DEMO_MODE=true) log visitors straight into a shared
 *  sandbox account — see ADR 0014. Read at call time so tests can stub it. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}
