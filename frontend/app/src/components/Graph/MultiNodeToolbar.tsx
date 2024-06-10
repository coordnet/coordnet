import clsx from "clsx";
import { ReactNode, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "react-tooltip";
import {
  Align,
  getNodesBounds,
  Node,
  NodeToolbarProps,
  Position,
  Rect,
  Transform,
  useOnSelectionChange,
  useViewport,
} from "reactflow";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { nodeColors } from "@/constants";
import { useNode } from "@/hooks";

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
  align: Align,
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

function NodeToolbar({
  className,
  isVisible,
  position = Position.Top,
  offset = 10,
  align = "center",
  ...rest
}: NodeToolbarProps) {
  const { x, y, zoom } = useViewport();
  const { nodesMap } = useNode();
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);

  useOnSelectionChange({
    onChange: useCallback(({ nodes }) => {
      setSelectedNodes(nodes);
    }, []),
  });

  const isActive = typeof isVisible === "boolean" ? isVisible : selectedNodes.length > 0;

  if (!isActive || selectedNodes.length === 0) {
    return null;
  }

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

  const nodeRect: Rect = getNodesBounds(selectedNodes, [0, 0]);

  return (
    <NodeToolbarPortal>
      <div
        style={{
          position: "absolute",
          transform: getTransform(nodeRect, [x, y, zoom], position, offset, align),
          zIndex: Math.max(...selectedNodes.map((node) => (node.zIndex || 1) + 1)),
        }}
        className={clsx(
          "border nodrag cursor-default border-gray rounded shadow-md bg-white",
          "h-9 flex items-center px-4 gap-4",
          className,
        )}
        {...rest}
      >
        <Menubar unstyled>
          <MenubarMenu>
            <MenubarTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto" data-tooltip-id="node-color">
                <div
                  className={clsx(
                    "cursor-pointer size-3 rounded-lg border-gray-1 border border-dashed",
                  )}
                ></div>
              </Button>
            </MenubarTrigger>
            <MenubarContent className="min-w-28">
              {nodeColors.map((color) => (
                <MenubarItem onClick={() => setColor(color)} key={color.color}>
                  <div
                    className="size-3 rounded-lg border mr-2"
                    style={{ backgroundColor: color.color }}
                  ></div>
                  {color.value}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <Tooltip id="node-color">Color</Tooltip>
        <div className="border-r border-gray h-5"></div>
        <Menubar unstyled>
          <MenubarMenu>
            <MenubarTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto" data-tooltip-id="node-progress">
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
