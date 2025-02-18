import { useOnViewportChange, useReactFlow } from "@xyflow/react";
import clsx from "clsx";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DragEvent, MouseEvent, useState } from "react";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";

import { useCanvas, useFocus, useNodesContext, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

import { Button } from "../ui/button";
import { addInputNode, addNodeToCanvas } from "./utils";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

const Sidebar = ({
  takeSnapshot,
  className,
  onLayoutNodes,
}: {
  takeSnapshot: () => void;
  className?: string;
  onLayoutNodes: () => Promise<void>;
}) => {
  const { parent, scope } = useYDoc();
  const { nodes, nodesMap, edgesMap, inputNodes } = useCanvas();
  const { nodesMap: spaceMap } = useNodesContext();

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

    // If we are in a skill then add an input node
    if (isSkill && scope != YDocScope.READ_WRITE)
      return addInputNode(nodes, nodesMap, edgesMap, spaceMap, inputNodes);

    if (!nodesMap || !spaceMap) return toast.error("Nodes not loaded");

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
          onDragStart={(event: DragEvent) => {
            if (scope !== YDocScope.READ_WRITE || isSkill) return;
            onDragStart(event, "node-1");
          }}
          draggable={scope === YDocScope.READ_WRITE}
          data-tooltip-id="add-node"
          data-tooltip-place="right"
          disabled={scope !== YDocScope.READ_WRITE && !isSkill}
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
