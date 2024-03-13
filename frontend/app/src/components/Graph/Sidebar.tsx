import clsx from "clsx";
import { PlusSquare } from "lucide-react";
import { DragEvent, MouseEvent, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useOnViewportChange, XYPosition } from "reactflow";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

const Sidebar = ({
  addNode,
  className,
}: {
  addNode: (position: XYPosition) => void;
  className?: string;
}) => {
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);

  useOnViewportChange({
    onChange: () => {
      setLastClickTime(0);
      setClickCount(0);
    },
  });

  const onClick = (event: MouseEvent) => {
    event.preventDefault();

    const currentTime = Date.now();
    let currentClickCount = clickCount;
    if (currentTime - lastClickTime <= 5000) {
      // If the clicks are within 5 seconds then add to the clickCount to offset the nodes
      currentClickCount = clickCount + 1;
      setClickCount(currentClickCount);
    } else {
      // Otherwise reset click count
      currentClickCount = 0;
      setClickCount(currentClickCount);
    }
    setLastClickTime(currentTime);

    const targetPosition = event.currentTarget.getBoundingClientRect();
    const x = targetPosition.x + targetPosition.width + 30 + currentClickCount * 25;
    const y = targetPosition.y - targetPosition.height / 2 + currentClickCount * 25;
    addNode({ x, y });
  };

  return (
    <aside className={clsx("p-2", className)}>
      <div
        className="p-2 bg-white shadow-background cursor-pointer"
        onClick={onClick}
        onDragStart={(event: DragEvent) => onDragStart(event, "node-1")}
        draggable
        data-tooltip-id="add-node"
        data-tooltip-content="Add Node"
        data-tooltip-place="right"
      >
        <PlusSquare className="text-purple size-5" />
      </div>

      <Tooltip id="add-node" className="!text-sm !px-3" />
    </aside>
  );
};

export default Sidebar;
