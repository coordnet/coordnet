import { DragEvent } from "react";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

const Sidebar = () => {
  return (
    <aside>
      <div className="description">You can drag these nodes to the pane on the right.</div>
      <div
        className="react-flow__node-input"
        onDragStart={(event: DragEvent) => onDragStart(event, "node-1")}
        draggable
      >
        Node 1
      </div>
      <div
        className="react-flow__node-default"
        onDragStart={(event: DragEvent) => onDragStart(event, "node-2")}
        draggable
      >
        Node 2
      </div>
      <div
        className="react-flow__node-output"
        onDragStart={(event: DragEvent) => onDragStart(event, "output")}
        draggable
      >
        Output Node
      </div>
    </aside>
  );
};

export default Sidebar;
