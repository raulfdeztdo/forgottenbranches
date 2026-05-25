import { Box, Text } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { COLORS } from '../colors.js';

export type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  type: ToastType;
  message: string;
}

let addToast: ((toast: ToastData) => void) | null = null;

export function showToast(type: ToastType, message: string) {
  addToast?.({ type, message });
}

export default function Toast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    addToast = (t: ToastData) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(t);
      timerRef.current = setTimeout(() => setToast(null), 3000);
    };
    return () => {
      const timer = timerRef.current;
      addToast = null;
      if (timer) clearTimeout(timer);
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
