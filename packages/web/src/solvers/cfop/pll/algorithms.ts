/**
 * 21 PLL algorithms for yellow-on-D (standard PLL with U→D substitution).
 * Each algorithm permutes the last layer without changing orientation.
 */
export const PLL_ALGORITHMS: Record<string, readonly string[]> = {
  Aa: ["R'", "F", "R'", "B2", "R", "F'", "R'", "B2", "R2"],
  Ab: ["R", "B'", "R", "F2", "R'", "B", "R", "F2", "R2"],
  E: ["R", "D'", "R'", "D'", "R", "D", "R'", "D", "R", "D", "R'", "D", "R", "D'", "R'", "D'", "R", "D", "R'", "D", "R", "D'", "R'", "D'"],
  F: ["R'", "D'", "F'", "R", "D", "R'", "D'", "R'", "F", "R", "F'", "R", "D'", "R'"],
  Ga: ["R2", "D", "R'", "D'", "R", "D", "R'", "D'", "R", "D", "R'"],
  Gb: ["R'", "D'", "R", "D'", "R'", "D2", "R", "D", "R'", "D", "R"],
  Gc: ["R2", "D'", "R", "D", "R'", "D'", "R", "D", "R'", "D'", "R"],
  Gd: ["R", "D", "R'", "D", "R", "D2", "R'", "D'", "R", "D'", "R'"],
  H: ["R2", "D2", "R", "D2", "R2"],
  Ja: ["R'", "D", "L'", "D2", "R", "D'", "R'", "D2", "R", "L"],
  Jb: ["R", "D", "R'", "F'", "R", "D", "R'", "D'", "R'", "F", "R2", "D", "R'"],
  Na: ["R", "D", "R'", "D", "R", "F", "R2", "D'", "R'", "D'", "R", "D", "R'", "F'"],
  Nb: ["R'", "D", "R", "D'", "R'", "F", "R2", "D", "R", "D'", "R'", "D", "R", "F'"],
  Ra: ["R", "D'", "R'", "F'", "R", "D", "R'", "D'", "R'", "F", "R2", "D", "R'", "D'", "R"],
  Rb: ["R'", "F", "R", "F'", "R'", "F", "R2", "D'", "R", "D", "R'", "D'", "R"],
  T: ["R", "D", "R'", "D'", "R'", "F", "R2", "D'", "R'", "D'", "R", "D", "R'", "F'"],
  Ua: ["R", "D'", "R", "D", "R", "D", "R", "D'", "R'", "D'", "R2"],
  Ub: ["R2", "D", "R", "D", "R'", "D'", "R'", "D'", "R'", "D", "R'"],
  V: ["R'", "D", "R", "D", "R'", "D'", "R'", "D", "R", "D", "R'", "F'", "R2", "D'", "R'", "D'", "R", "D", "R'", "F'"],
  Y: ["F", "R", "D'", "R'", "D'", "R", "D", "R'", "F'", "R", "D", "R'", "D'", "R'", "F", "R", "F'"],
  Z: ["R'", "F", "R", "D", "R'", "D'", "R", "D", "R'", "D'", "R", "F'"],
};

export const PLL_CASE_IDS = Object.keys(PLL_ALGORITHMS) as (keyof typeof PLL_ALGORITHMS)[];

export type PllCaseId = (typeof PLL_CASE_IDS)[number];
