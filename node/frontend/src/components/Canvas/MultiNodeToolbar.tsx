import {
  Align,
  Node,
  NodeToolbarProps,
  Position,
  ReactFlowState,
  Rect,
  Transform,
  useReactFlow,
  useStore,
  useViewport,
} from "@xyflow/react";
import clsx from "clsx";
import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { nodeColors } from "@/constants";
import { useCanvas } from "@/hooks";

import { Button } from "../ui/button";

function NodeToolbarPortal({ children }: { children: ReactNode }) {
  const wrapperRef = document.querySelector(".react-flow__renderer");

  if (!wrapperRef) {
    return null;
  }

  return createPortal(children, wrapperRef);
}

function getTransform(
  nodeRect: Rect,
  transform: Transform,
  position: Position,
  offset: number,
  align: Align
): string {
  let alignmentOffset = 0.5;

  if (align === "start") {
    alignmentOffset = 0;
  } else if (align === "end") {
    alignmentOffset = 1;
  }

  let pos = [
    (nodeRect.x + nodeRect.width * alignmentOffset) * transform[2] + transform[0],
    nodeRect.y * transform[2] + transform[1] - offset,
  ];

  let shift = [-100 * alignmentOffset, -100];

  switch (position) {
    case Position.Right:
      pos = [
        (nodeRect.x + nodeRect.width) * transform[2] + transform[0] + offset,
        (nodeRect.y + nodeRect.height * alignmentOffset) * transform[2] + transform[1],
      ];
      shift = [0, -100 * alignmentOffset];
      break;
    case Position.Bottom:
      pos[1] = (nodeRect.y + nodeRect.height) * transform[2] + transform[1] + offset;
      shift[1] = 0;
      break;
    case Position.Left:
      pos = [
        nodeRect.x * transform[2] + transform[0] - offset,
        (nodeRect.y + nodeRect.height * alignmentOffset) * transform[2] + transform[1],
      ];
      shift = [-100, -100 * alignmentOffset];
      break;
  }

  return `translate(${pos[0]}px, ${pos[1]}px) translate(${shift[0]}%, ${shift[1]}%)`;
}

const selectedNodesSelector = (state: ReactFlowState) =>
  state.nodes.filter((node) => node.selected).map((node) => node.id);

function NodeToolbar({
  className,
  position = Position.Top,
  offset = 10,
  align = "center",
  ...rest
}: NodeToolbarProps) {
  const { runId } = useParams();
  const { x, y, zoom } = useViewport();
  const { getNodesBounds } = useReactFlow();
  const { nodes, nodesMap } = useCanvas();
  const selectedNodeIds = useStore(selectedNodesSelector);

  if (selectedNodeIds.length < 2 || runId) {
    return null;
  }

  const selectedNodes = nodes.filter((n) => n?.selected);
  const nodeRect: Rect = getNodesBounds(selectedNodes as Node[]);

  const setProgress = (progress: number) => {
    selectedNodes.forEach((n) => {
      const node = nodesMap?.get(n.id);
      if (node) nodesMap?.set(node.id, { ...node, data: { ...node?.data, progress } });
    });
  };

  const setColor = (color: { color: string; value: string }) => {
    selectedNodes.forEach((n) => {
      const node = nodesMap?.get(n.id);
      if (node)
        nodesMap?.set(node.id, { ...node, data: { ...node?.data, borderColor: color.color } });
    });
  };

  return (
    <NodeToolbarPortal>
      <div
        style={{
          position: "absolute",
          transform: getTransform(nodeRect, [x, y, zoom], position, offset, align),
          zIndex: Math.max(...selectedNodes.map((node) => (node.zIndex || 1) + 1)),
        }}
        className={clsx(
          "nodrag border-gray cursor-default rounded border bg-white shadow-md",
          "flex h-9 items-center gap-4 px-4",
          className
        )}
        {...rest}
      >
        <Menubar unstyled>
          <MenubarMenu>
            <MenubarTrigger asChild>
              <Button variant="ghost" className="h-auto p-0" data-tooltip-id="node-color">
                <div
                  className={clsx(
                    "size-3 cursor-pointer rounded-lg border border-dashed border-gray-1"
                  )}
                ></div>
              </Button>
            </MenubarTrigger>
            <MenubarContent className="min-w-28">
              {nodeColors.map((color) => (
                <MenubarItem onClick={() => setColor(color)} key={color.color}>
                  <div
                    className="mr-2 size-3 rounded-lg border"
                    style={{ backgroundColor: color.color }}
                  ></div>
                  {color.value}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <Tooltip id="node-color">Color</Tooltip>
        <div className="border-gray h-5 border-r"></div>
        <Menubar unstyled>
          <MenubarMenu>
            <MenubarTrigger asChild>
              <Button variant="ghost" className="h-auto p-0" data-tooltip-id="node-progress">
                <div className="cursor-pointer text-sm">%</div>
              </Button>
            </MenubarTrigger>
            <MenubarContent className="min-w-20">
              <MenubarItem onClick={() => setProgress(25)}>25%</MenubarItem>
              <MenubarItem onClick={() => setProgress(50)}>50%</MenubarItem>
              <MenubarItem onClick={() => setProgress(75)}>75%</MenubarItem>
              <MenubarItem onClick={() => setProgress(100)}>100%</MenubarItem>
              <MenubarItem onClick={() => setProgress(0)}>None</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <Tooltip id="node-progress">Progress</Tooltip>
      </div>
    </NodeToolbarPortal>
  );
}

export default NodeToolbar;
