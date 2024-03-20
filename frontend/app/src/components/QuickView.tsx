import { Maximize2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";

import { useSpace } from "@/hooks";
import useQuickView from "@/hooks/useQuickView";

const QuickView = () => {
  const { space } = useSpace();
  const { isQuickViewOpen, nodeId, closeQuickView } = useQuickView();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isQuickViewOpen) {
        closeQuickView();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeQuickView, isQuickViewOpen]);

  useEffect(() => {
    if (isQuickViewOpen && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [iframeRef, isQuickViewOpen]);

  if (!isQuickViewOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40"
      style={{ animation: "bg 0.2s forwards" }}
      tabIndex={0}
    >
      <div className="absolute inset-0" onClick={closeQuickView}></div>

      <div
        className="relative z-10 bg-white h-[90vh] w-[80vw] shadow-lg rounded-md transition-all transform duration-300 ease-in-out border"
        style={{ animation: "scaleIn 0.2s forwards" }}
      >
        {/* {Boolean(nodeId) && <Node id={nodeId} className="size-full" />} */}
        {Boolean(nodeId) && (
          <iframe
            ref={iframeRef}
            className="size-full"
            src={`/space/${space?.id}/${nodeId}`}
          ></iframe>
        )}

        <div className="justify-between items-center absolute top-0 -right-9 z-50 flex flex-col gap-3">
          <button
            onClick={closeQuickView}
            className="size-7 overflow-hidden rounded-full bg-black text-white flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
          <Link
            to={`/space/${space?.id}/${nodeId}`}
            onClick={closeQuickView}
            className="size-7 overflow-hidden rounded-full bg-black hover:text-white text-white flex items-center justify-center"
          >
            <Maximize2 className="size-4" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default QuickView;
