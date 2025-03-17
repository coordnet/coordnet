import { CanvasNode } from "@coordnet/core";
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
import { useCanvas, useQuickView, useYDoc } from "@/hooks";
import { YDocScope } from "@/types";

import { Button } from "../ui/button";

const HoverMenu = ({
  id,
  data,
  onClickEdit,
  className,
}: {
  id: string;
  data: CanvasNode["data"];
  onClickEdit: (e: React.MouseEvent) => void;
  className?: string;
}) => {
  const { parent, scope } = useYDoc();
  const { nodesMap, nodeFeatures } = useCanvas();
  const { showQuickView } = useQuickView();
  const navigate = useNavigate();

  const canWrite = scope == YDocScope.READ_WRITE;
  const { hasPage, hasCanvas } = nodeFeatures(id);
  const CanvasIcon = hasCanvas ? Share2 : GitBranchPlus;

  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const setProgress = (progress: number) => {
    const node = nodesMap?.get(id);
    if (node) nodesMap?.set(id, { ...node, data: { ...node?.data, progress } });
  };

  const setColor = (color: { color: string; value: string }) => {
    const node = nodesMap?.get(id);
    if (node) nodesMap?.set(id, { ...node, data: { ...node?.data, borderColor: color.color } });
  };

  // TODO: Should we disable this menu for read-only?
  if (!canWrite) return null;

  return (
    <div
      className={clsx(
        "nodrag border-gray cursor-default rounded border bg-white shadow-md",
        "flex h-9 items-center gap-4 px-4",
        className
      )}
    >
      <Button
        variant="ghost"
        onClick={onClickEdit}
        className="h-auto p-0"
        disabled={!canWrite}
        data-tooltip-id="node-edit"
      >
        <Edit className="size-4 cursor-pointer" />
      </Button>
      <Tooltip id="node-edit">Edit text</Tooltip>
      <div className="border-gray h-5 border-r"></div>
      <Button
        variant="ghost"
        className="h-auto p-0"
        disabled={data?.syncing || (!hasPage && !canWrite)}
        data-tooltip-id="node-page"
        onClick={() => setNodePage(nodePage == id ? "" : id)}
      >
        <FileText className="size-4 cursor-pointer" />
      </Button>
      <Tooltip id="node-page">{hasCanvas ? "Open Page" : "Create Page"}</Tooltip>
      <div className="border-gray h-5 border-r"></div>
      <Button
        variant="ghost"
        className="h-auto p-0"
        data-tooltip-id="quick-view"
        disabled={data?.syncing || (!hasCanvas && !canWrite)}
        onClick={() =>
          hasCanvas ? showQuickView(id) : navigate(`/${parent?.type}s/${parent.data?.id}/${id}`)
        }
      >
        <CanvasIcon className={clsx("size-4 cursor-pointer", hasCanvas && "rotate-90")} />
      </Button>
      <Tooltip id="quick-view">{hasCanvas ? "Show Canvas" : "Create Canvas"}</Tooltip>
      <div className="border-gray h-5 border-r"></div>
      <Menubar unstyled>
        <MenubarMenu>
          <MenubarTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0"
              data-tooltip-id="node-color"
              disabled={!canWrite}
            >
              <div
                className={clsx("size-3 cursor-pointer rounded-lg border border-gray-1", {
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
            <Button
              variant="ghost"
              className="h-auto p-0"
              data-tooltip-id="node-progress"
              disabled={!canWrite}
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
