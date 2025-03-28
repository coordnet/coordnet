import { useQuery } from "@tanstack/react-query";
import { useOnViewportChange, useReactFlow } from "@xyflow/react";
import clsx from "clsx";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DragEvent, MouseEvent, useState } from "react";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";

import { getSpaces } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useFocus, useNodesContext, useYDoc } from "@/hooks";
import { YDocScope } from "@/types";

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
  onLayoutNodes: (direction: "RIGHT" | "DOWN") => Promise<void>;
}) => {
  const { scope } = useYDoc();
  const { nodes, nodesMap, edgesMap, inputNodes } = useCanvas();
  const { nodesMap: spaceMap } = useNodesContext();
  const { data: spaces } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
  });

  const filteredSpaces = spaces?.results.filter(
    (space) => !(space.is_public && !space.allowed_actions.includes("manage"))
  );

  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const { setNodeRepositoryVisible } = useFocus();
  const reactFlow = useReactFlow();

  useOnViewportChange({
    onChange: () => {
      setLastClickTime(0);
      setClickCount(0);
    },
  });

  const onClick = (event: MouseEvent) => {
    event.preventDefault();

    // If we are in a skill then add an input node
    if (scope == YDocScope.READ_ONLY_WITH_INPUT)
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
            if (scope == YDocScope.READ_ONLY) return;
            onDragStart(event, "node-1");
          }}
          draggable={scope !== YDocScope.READ_ONLY}
          data-tooltip-id="add-node"
          data-tooltip-place="right"
          disabled={scope == YDocScope.READ_ONLY}
        >
          <Plus strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="add-node">Add Node</Tooltip>
        {Boolean(filteredSpaces && filteredSpaces.length > 0) && (
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={scope !== YDocScope.READ_WRITE}>
            <Button
              variant="outline"
              className="size-9 p-0 shadow"
              data-tooltip-id="layout-nodes"
              data-tooltip-place="right"
            >
              <LayoutDashboard strokeWidth={2.8} className="size-4 text-neutral-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuItem className="cursor-pointer" onClick={() => onLayoutNodes("DOWN")}>
              Align Down
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => onLayoutNodes("RIGHT")}>
              Align Right
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip id="layout-nodes">Layout nodes</Tooltip>
      </div>
    </aside>
  );
};

export default Sidebar;
