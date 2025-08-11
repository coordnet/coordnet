import { useEffect, useState } from 'react';

interface KeyboardState {
  alt: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
}

export function useKeyboardState() {
  const [keyState, setKeyState] = useState<KeyboardState>({
    alt: false,
    shift: false,
    ctrl: false,
    meta: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeyState({
        alt: event.altKey,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeyState({
        alt: event.altKey,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
      });
    };

    const handleWindowBlur = () => {
      setKeyState({
        alt: false,
        shift: false,
        ctrl: false,
        meta: false,
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return keyState;
}