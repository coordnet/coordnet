import { useEffect, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";

const usePosition = (width: number) => {
  const [position, setPosition] = useLocalStorageState("coordnet:llmX", {
    defaultValue: () => ((window.innerWidth - width) / 2 / window.innerWidth) * 100,
  });
  const dragItem = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setPosition(((window.innerWidth - width) / 2 / window.innerWidth) * 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setPosition, width]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!dragItem.current) return;
    dragging.current = true;
    dragStartX.current = e.clientX - dragItem.current.getBoundingClientRect().left;
    document.addEventListener("mousemove", handleDragging);
    document.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragging = (e: MouseEvent) => {
    if (dragging.current) {
      let newPosition = e.clientX - dragStartX.current;
      newPosition = Math.max(0, Math.min(newPosition, window.innerWidth - width));
      setPosition((newPosition / window.innerWidth) * 100);
    }
  };

  const handleDragEnd = () => {
    dragging.current = false;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", handleDragEnd);
  };
  return { position, dragItem, handleDragStart };
};

export default usePosition;
