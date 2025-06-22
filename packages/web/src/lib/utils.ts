import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for combining and merging CSS class names
 * 
 * Combines clsx for conditional class handling with tailwind-merge
 * for intelligent Tailwind CSS class deduplication and conflict resolution.
 * 
 * @param inputs - Class values that can be strings, objects, arrays, etc.
 * @returns Merged and deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
