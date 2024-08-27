import { DialogTitle } from "@radix-ui/react-dialog";
import clsx from "clsx";
import { LayoutDashboard, PlayCircle, Plus, Search } from "lucide-react";
import { DragEvent, MouseEvent, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useOnViewportChange } from "reactflow";
import * as Y from "yjs";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFocus, useNode } from "@/hooks";
import { GraphNode, SpaceNode } from "@/types";

import { Button } from "../ui/button";
import ExecutionPlanRenderer from "./ExecutionPlan";
import { useRunCanvas } from "./tasks/useRunCanvas";
import { addNodeToGraph } from "./utils";

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
  nodesMap: Y.Map<GraphNode>;
  spaceMap: Y.Map<SpaceNode>;
  takeSnapshot: () => void;
  className?: string;
  onLayoutNodes: () => Promise<void>;
}) => {
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const { setNodeRepositoryVisible } = useFocus();
  const { node } = useNode();
  const { runCanvas, resetCanvas } = useRunCanvas();

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
    addNodeToGraph(nodesMap, spaceMap, "New node", { x, y }, "", { editing: true });
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
          disabled={!node?.allowed_actions.includes("write")}
        >
          <Plus strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="add-node">Add Node</Tooltip>
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={() => setNodeRepositoryVisible(true)}
          data-tooltip-id="node-repository"
          data-tooltip-place="right"
          disabled={!node?.allowed_actions.includes("write")}
        >
          <Search strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="node-repository">Node Repository</Tooltip>
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={() => onLayoutNodes()}
          data-tooltip-id="layout-nodes"
          data-tooltip-place="right"
          disabled={!node?.allowed_actions.includes("write")}
        >
          <LayoutDashboard strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="layout-nodes">Layout nodes</Tooltip>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="size-9 p-0 shadow focus-visible:!ring-0"
              disabled={!node?.allowed_actions.includes("write")}
            >
              <PlayCircle strokeWidth={2.8} className="text-neutral-600 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-20 mt-1" side="right" align="start">
            <DropdownMenuItem className="cursor-pointer" onClick={() => runCanvas()}>
              Run Canvas
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => runCanvas(true)}>
              Run Selection
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setPlanOpen(true)}>
              Show Analysis
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => resetCanvas()}
              data-tooltip-id="run-canvas"
              data-tooltip-place="right"
            >
              Reset Canvas
            </DropdownMenuItem>
            <Tooltip id="run-canvas">
              Use this to remove highlighted state from nodes if processing was interrupted
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog onOpenChange={(open) => setPlanOpen(open)} open={planOpen}>
        <DialogTrigger></DialogTrigger>
        <DialogContent className="w-4/5 max-w-4/5 h-4/5 max-h-4/5 overflow-hidden">
          <DialogTitle className="hidden">Test</DialogTitle>
          <ExecutionPlanRenderer />
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default Sidebar;
