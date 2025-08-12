import { useEffect, useState } from "react";

export const useKeyboardState = () => {
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Alt":
          setIsAltPressed(true);
          break;
        case "Shift":
          setIsShiftPressed(true);
          break;
        case "Control":
          setIsCtrlPressed(true);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Alt":
          setIsAltPressed(false);
          break;
        case "Shift":
          setIsShiftPressed(false);
          break;
        case "Control":
          setIsCtrlPressed(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return {
    isAltPressed,
    isShiftPressed,
    isCtrlPressed,
  };
};
