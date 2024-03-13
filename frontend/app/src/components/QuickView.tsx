import { Maximize2, X } from "lucide-react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";

import useQuickView from "@/hooks/useQuickView";

import { Node } from "./";

const QuickView = () => {
  const { isQuickViewOpen, nodeId, closeQuickView } = useQuickView();

  if (!isQuickViewOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      style={{ animation: "bg 0.2s forwards" }}
    >
      <div className="absolute inset-0" onClick={closeQuickView}></div>

      <div
        className="relative z-10 bg-white h-[90vh] w-[80vw] shadow-lg rounded-md transition-all transform duration-300 ease-in-out border"
        style={{ animation: "scaleIn 0.2s forwards" }}
      >
        {Boolean(nodeId) && <Node id={nodeId} className="size-full" />}

        <div className="justify-between items-center absolute top-0 -right-9 z-50 flex flex-col gap-3">
          <button
            onClick={closeQuickView}
            className="size-7 overflow-hidden rounded-full bg-black text-white flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
          <Link
            to={`/space/124/${nodeId}`}
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
