export const COLORS = {
  bg: '#2c313c',
  bgSecondary: '#343b48',
  text: '#abb2bf',
  textSecondary: '#7a8290',
  accent: '#61afef',
  danger: '#e06c75',
  warning: '#d19a66',
  success: '#98c379',
  purple: '#c678dd',
  yellow: '#e5c07b',
  gray: '#5c6370',
  white: '#ffffff',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  forgotten: COLORS.danger,
  merged: COLORS.yellow,
  orphan: COLORS.warning,
  abandoned: COLORS.gray,
};
