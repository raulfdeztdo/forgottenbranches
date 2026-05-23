import { useInput, type Key } from 'ink';

export type KeyHandler = (input: string, key: Key) => void;

export function useKeyboard(handler: KeyHandler) {
  useInput((input, key) => {
    handler(input, key);
  });
}
