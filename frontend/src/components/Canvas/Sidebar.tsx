import clsx from "clsx";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DragEvent, MouseEvent, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useOnViewportChange, useReactFlow } from "reactflow";
import * as Y from "yjs";

import { useFocus, useYDoc } from "@/hooks";
import { BackendEntityType, CanvasNode, SpaceNode, YDocScope } from "@/types";

import { Button } from "../ui/button";
import { addNodeToCanvas } from "./utils";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

const Sidebar = ({
  nodesMap,
  spaceMap,
  takeSnapshot,
  className,
  onLayoutNodes,
}: {
  nodesMap: Y.Map<CanvasNode>;
  spaceMap: Y.Map<SpaceNode>;
  takeSnapshot: () => void;
  className?: string;
  onLayoutNodes: () => Promise<void>;
}) => {
  const { parent, scope } = useYDoc();

  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const { setNodeRepositoryVisible } = useFocus();
  const reactFlow = useReactFlow();

  const isSkill = parent.type === BackendEntityType.SKILL;

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
    takeSnapshot();
    const flowPosition = reactFlow.screenToFlowPosition({ x, y });
    addNodeToCanvas(nodesMap, spaceMap, "New node", flowPosition, "", { editing: true });
  };

  return (
    <aside className={clsx("p-2", className)}>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={onClick}
          onDragStart={(event: DragEvent) => onDragStart(event, "node-1")}
          draggable
          data-tooltip-id="add-node"
          data-tooltip-place="right"
          disabled={scope !== YDocScope.READ_WRITE}
        >
          <Plus strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="add-node">Add Node</Tooltip>
        {!isSkill && (
          <Button
            variant="outline"
            className="size-9 p-0 shadow"
            onClick={() => setNodeRepositoryVisible(true)}
            data-tooltip-id="node-repository"
            data-tooltip-place="right"
            disabled={scope !== YDocScope.READ_WRITE}
          >
            <Search strokeWidth={2.8} className="size-4 text-neutral-600" />
          </Button>
        )}
        <Tooltip id="node-repository">Node Repository</Tooltip>
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={() => onLayoutNodes()}
          data-tooltip-id="layout-nodes"
          data-tooltip-place="right"
          disabled={scope !== YDocScope.READ_WRITE}
        >
          <LayoutDashboard strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="layout-nodes">Layout nodes</Tooltip>
      </div>
    </aside>
  );
};

export default Sidebar;
