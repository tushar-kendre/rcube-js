// Core cube face identifiers
export type CubeFace = "front" | "back" | "left" | "right" | "top" | "bottom";

// Standard Rubik's cube colors
export type CubeColor =
  | "white"
  | "yellow"
  | "red"
  | "orange"
  | "blue"
  | "green";

/**
 * Move notation string representing cube rotations
 * Examples: 'R', 'R2', '2R', "3U'", etc.
 * Parsed dynamically based on cube size and notation standards
 */
export type MoveNotation = string;

/**
 * Default color mapping for each face in solved state
 */
export const DEFAULT_CUBE_COLORS: Record<CubeFace, CubeColor> = {
  front: "red",
  back: "orange",
  left: "green",
  right: "blue",
  top: "white",
  bottom: "yellow",
};

/**
 * Color mapping from cube colors to hex color codes for rendering
 */
export const COLOR_MAP: Record<CubeColor, string> = {
  white: "#ffffff",
  yellow: "#ffff00",
  red: "#ff0000",
  orange: "#ff8800",
  blue: "#0000ff",
  green: "#00ff00",
};
