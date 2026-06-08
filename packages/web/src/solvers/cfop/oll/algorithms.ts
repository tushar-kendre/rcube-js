/**
 * Two-look OLL generators.
 *
 * Standard last-layer-on-U algorithms (outer moves only) are mirrored into this
 * cube's frame, where the last layer is on D. The mirror is the same vertical
 * reflection validated for F2L: swap U<->D and invert every turn (a 180° flip
 * about a horizontal axis), so a turn `X` becomes `X'`, `U` becomes `D'`, etc.
 *
 * Edge orientation (EOLL) uses the two classic `F (R U R' U') F'` shapes; corner
 * orientation (OCLL) uses Sune and Antisune. The OLL search composes these with
 * last-layer setups to orient any case in two looks.
 */

const TOKEN = /^([UDLRFB])(2|')?$/;

/** Mirrors one standard (last-layer-on-U) token into this frame (last layer on D). */
function mirrorToken(tok: string): string {
  const m = tok.match(TOKEN);
  if (!m) throw new Error(`Bad OLL token: ${tok}`);
  let face = m[1];
  const amount = m[2] === "2" ? 2 : m[2] === "'" ? 3 : 1;
  const inv = amount === 1 ? 3 : amount === 3 ? 1 : 2;
  if (face === "U") face = "D";
  else if (face === "D") face = "U";
  return face + (inv === 2 ? "2" : inv === 3 ? "'" : "");
}

function mirror(alg: readonly string[]): string[] {
  return alg.map(mirrorToken);
}

/** Standard EOLL shapes (last layer on U). */
const STANDARD_EOLL: readonly (readonly string[])[] = [
  ["F", "R", "U", "R'", "U'", "F'"],
  ["F", "U", "R", "U'", "R'", "F'"],
];

/** Standard OCLL generators: Sune and Antisune (last layer on U). */
const STANDARD_OCLL: readonly (readonly string[])[] = [
  ["R", "U", "R'", "U", "R", "U2", "R'"],
  ["R", "U2", "R'", "U'", "R", "U'", "R'"],
];

/** Edge-orientation generators in this cube's frame. */
export const EOLL_GENERATORS: string[][] = STANDARD_EOLL.map(mirror);

/** Corner-orientation generators (Sune / Antisune) in this cube's frame. */
export const OCLL_GENERATORS: string[][] = STANDARD_OCLL.map(mirror);
