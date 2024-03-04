import ReactDOM from "react-dom";

import useQuickView from "@/hooks/useQuickView";

import { Node } from "./";

const QuickView = () => {
  const { isQuickViewOpen, nodeId, closeQuickView } = useQuickView();

  if (!isQuickViewOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
      <div className="absolute inset-0" onClick={closeQuickView}></div>

      <div
        className="relative z-10 max-w-xl w-full bg-white p-5 shadow-lg rounded-md transition-all transform duration-300 ease-in-out border"
        style={{ animation: "scaleIn 0.2s forwards" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Quick View</h4>
          <div>
            {/* <button onClick={onExpand} className="text-gray-600 hover:text-gray-800 mr-2">
              Expand
            </button> */}
            <button onClick={closeQuickView} className="text-gray-600 hover:text-gray-800">
              Close
            </button>
          </div>
        </div>
        <Node id={nodeId} className="px-3 py-2 size-full" />
      </div>
    </div>,
    document.body,
  );
};

export default QuickView;
