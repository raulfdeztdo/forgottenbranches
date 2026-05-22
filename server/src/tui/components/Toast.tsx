import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { COLORS } from '../colors.js';

export type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  type: ToastType;
  message: string;
}

let addToast: (toast: ToastData) => void;

export function showToast(type: ToastType, message: string) {
  if (addToast) addToast({ type, message });
}

export default function Toast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    addToast = (t: ToastData) => {
      setToast(t);
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    };
    return () => {
      addToast = () => {};
    };
  }, []);

  if (!toast) return null;

  const color =
    toast.type === 'success'
      ? COLORS.success
      : toast.type === 'error'
        ? COLORS.danger
        : COLORS.accent;

  return (
    <Box marginTop={1}>
      <Text color={color} bold>
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}{' '}
        {toast.message}
      </Text>
    </Box>
  );
}
