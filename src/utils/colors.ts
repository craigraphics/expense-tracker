/**
 * Color constants for the application
 * Centralized color definitions for consistent theming
 */

export const colors = {
  // Primary button colors
  primary: {
    light: '#5e6aba',
    dark: '#333f8b',
    lightHover: '#525aa0',
    darkHover: '#2a3570',
  },

  // Danger/delete button colors
  danger: {
    light: '#895355',
    dark: '#6d2123',
    lightHover: '#7a4749',
    darkHover: '#5a1a1b',
  },

  // Input backgrounds
  input: {
    dark: '#192028',
  },
} as const;

/**
 * Get the primary button background class
 * Applies light mode color by default, dark mode color in dark theme
 */
export function getPrimaryBgClass(includeHover = false): string {
  const base = `bg-[${colors.primary.light}] dark:bg-[${colors.primary.dark}]`;
  if (includeHover) {
    return `${base} hover:bg-[${colors.primary.lightHover}] dark:hover:bg-[${colors.primary.darkHover}]`;
  }
  return base;
}

/**
 * Get the danger button background class
 * Applies light mode color by default, dark mode color in dark theme
 */
export function getDangerBgClass(includeHover = false): string {
  const base = `bg-[${colors.danger.light}] dark:bg-[${colors.danger.dark}]`;
  if (includeHover) {
    return `${base} hover:bg-[${colors.danger.lightHover}] dark:hover:bg-[${colors.danger.darkHover}]`;
  }
  return base;
}

/**
 * Get the input dark background class
 */
export function getInputDarkBgClass(): string {
  return `dark:bg-[${colors.input.dark}]`;
}
