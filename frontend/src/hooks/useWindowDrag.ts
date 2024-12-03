import { useEffect, useRef, useState } from "react";

const useWindowDrag = () => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const isFileFromOS = useRef(true);
  const cachedTarget = useRef<EventTarget | null>(null);
  const hasDraggedFileOutside = useRef(false);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      cachedTarget.current = e.target;

      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;

      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
    };

    const handleDragStart = () => {
      isFileFromOS.current = false;
      hasDraggedFileOutside.current = false;
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragstart", handleDragStart);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return isDragging;
};

export default useWindowDrag;
