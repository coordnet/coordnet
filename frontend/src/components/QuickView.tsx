import { Maximize2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Link, useParams } from "react-router-dom";

import { useYDoc } from "@/hooks";
import useQuickView from "@/hooks/useQuickView";

const QuickView = () => {
  const { runId, versionId } = useParams();
  const { parent } = useYDoc();
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
      className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-40"
      style={{ animation: "bg 0.2s forwards" }}
      tabIndex={0}
    >
      <div className="absolute inset-0" onClick={closeQuickView}></div>
      <div
        className="relative h-[90vh] w-[80vw] transform rounded-md border bg-white shadow-lg
          transition-all duration-300 ease-in-out"
        style={{ animation: "scaleIn 0.2s forwards" }}
      >
        {Boolean(nodeId) && (
          <iframe
            ref={iframeRef}
            className="size-full"
            src={
              `/${parent.type}s/${parent.data?.id}/` +
              (versionId ? `versions/${versionId}/` : "") +
              nodeId +
              (runId ? `/runs/${runId}/` : "")
            }
          ></iframe>
        )}

        <div className="absolute -right-9 top-0 flex flex-col items-center justify-between gap-3">
          <button
            onClick={closeQuickView}
            className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-black
              text-white"
          >
            <X className="size-4" />
          </button>
          <Link
            to={`/${parent.type}s/${parent.data?.id}/${nodeId}`}
            target="_top"
            className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-black
              text-white hover:text-white"
          >
            <Maximize2 className="size-4" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickView;
