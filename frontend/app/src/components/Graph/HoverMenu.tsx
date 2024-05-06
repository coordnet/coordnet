import clsx from "clsx";
import { Edit, FileText, GitBranchPlus, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { nodeColors } from "@/constants";
import { useNode, useQuickView, useSpace } from "@/hooks";
import { GraphNode } from "@/types";

import { Button } from "../ui/button";

const HoverMenu = ({
  id,
  data,
  onClickEdit,
  className,
}: {
  id: string;
  data: GraphNode["data"];
  onClickEdit: (e: React.MouseEvent) => void;
  className?: string;
}) => {
  const { nodesMap } = useNode();
  const { showQuickView } = useQuickView();
  const { space, backendNodes, scope } = useSpace();
  const navigate = useNavigate();

  const backendNode = backendNodes.find((node) => node.id === id);
  const hasGraph = Boolean(backendNode?.subnodes.length);
  const hasPage = Boolean(backendNode?.text_token_count);
  const GraphIcon = hasGraph ? Share2 : GitBranchPlus;

  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const setProgress = (progress: number) => {
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: { ...node?.data, progress } });
  };

  const setColor = (color: { color: string; value: string }) => {
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: { ...node?.data, borderColor: color.color } });
  };

  return (
    <div
      className={clsx(
        "border nodrag cursor-default border-gray rounded shadow-md bg-white",
        "h-9 flex items-center px-4 gap-4",
        className,
      )}
    >
      <Button
        variant="ghost"
        onClick={onClickEdit}
        className="p-0 h-auto"
        disabled={scope != "read-write"}
        data-tooltip-id="node-edit"
      >
        <Edit className="cursor-pointer size-4" />
      </Button>
      <Tooltip id="node-edit">Edit text</Tooltip>
      <div className="border-r border-gray h-5"></div>
      <Button
        variant="ghost"
        className="p-0 h-auto"
        disabled={data?.syncing || (!hasPage && !backendNode?.allowed_actions.includes("write"))}
        data-tooltip-id="node-page"
        onClick={() => setNodePage(nodePage == id ? "" : id)}
      >
        <FileText className="cursor-pointer size-4" />
      </Button>
      <Tooltip id="node-page">{hasGraph ? "Open Page" : "Create Page"}</Tooltip>
      <div className="border-r border-gray h-5"></div>
      <Button
        variant="ghost"
        className="p-0 h-auto"
        data-tooltip-id="quick-view"
        disabled={data?.syncing || (!hasGraph && !backendNode?.allowed_actions.includes("write"))}
        onClick={() => (hasGraph ? showQuickView(id) : navigate(`/spaces/${space?.id}/${id}`))}
      >
        <GraphIcon className={clsx("cursor-pointer size-4", hasGraph && "rotate-90")} />
      </Button>
      <Tooltip id="quick-view">{hasGraph ? "Show Graph" : "Create Graph"}</Tooltip>
      <div className="border-r border-gray h-5"></div>
      <Menubar unstyled>
        <MenubarMenu>
          <MenubarTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto"
              data-tooltip-id="node-color"
              disabled={!backendNode?.allowed_actions.includes("write")}
            >
              <div
                className={clsx("cursor-pointer size-3 rounded-lg border-gray-1 border", {
                  "border-dashed": !data.borderColor,
                })}
                style={{ borderColor: data.borderColor, backgroundColor: data.borderColor }}
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
            <Button
              variant="ghost"
              className="p-0 h-auto"
              data-tooltip-id="node-progress"
              disabled={!backendNode?.allowed_actions.includes("write")}
            >
              <div className="cursor-pointer text-sm">{data?.progress}%</div>
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
  );
};

export default HoverMenu;
