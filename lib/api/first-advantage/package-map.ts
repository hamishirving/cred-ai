/**
 * FA Package Map
 *
 * Maps Credentially compliance element slugs <-> FA screening component types.
 * Used to translate FA screening results back to compliance element updates.
 */

/** Maps our element slugs to the FA screening component type that fulfils them */
export const elementToFAComponent: Record<string, string> = {
  "federal-background-check": "criminal_federal",
  "state-background-check": "criminal_state",
  "california-background-check": "criminal_state_ca",
  "texas-background-check": "criminal_state_tx",
  "florida-level2-background": "criminal_state_fl",
  "drug-screen": "drug_test_10panel",
  "oig-exclusion-check": "oig_exclusion",
  "sam-exclusion-check": "sam_exclusion",
};

/** Reverse map: FA component type -> compliance element slug */
export const faComponentToElement: Record<string, string> = Object.fromEntries(
  Object.entries(elementToFAComponent).map(([k, v]) => [v, k]),
);

/**
 * Given an FA screening result, determine which compliance elements it fulfils.
 */
export function mapScreeningToElements(
  screeningComponents: Array<{ type: string; status: string; result?: string }>,
): Array<{
  elementSlug: string;
  faComponentType: string;
  status: string;
  result?: string;
  canMarkVerified: boolean;
}> {
  return screeningComponents
    .filter((c) => faComponentToElement[c.type])
    .map((c) => ({
      elementSlug: faComponentToElement[c.type],
      faComponentType: c.type,
      status: c.status,
      result: c.result,
      canMarkVerified: c.status === "complete" && c.result === "clear",
    }));
}
