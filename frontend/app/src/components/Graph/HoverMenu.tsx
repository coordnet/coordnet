import clsx from "clsx";
import { Edit, FileText, ScanEye } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useNode, useQuickView } from "@/hooks";
import { GraphNode } from "@/types";

const HoverMenu = ({
  id,
  data,
  className,
}: {
  id: string;
  data: GraphNode["data"];
  className?: string;
}) => {
  const { nodesMap } = useNode();
  const { showQuickView } = useQuickView();

  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const setProgress = (progress: number) => {
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: { ...node?.data, progress } });
  };

  return (
    <div
      className={clsx(
        "border nodrag cursor-default border-gray rounded shadow-md bg-white",
        "h-9 flex items-center px-4 gap-4",
        className,
      )}
    >
      <Edit className="cursor-pointer size-4" data-tooltip-id="node-edit" />
      <Tooltip id="node-edit" className="!text-sm !px-3">
        Edit text
      </Tooltip>
      <div className="border-r border-gray h-5"></div>
      <FileText
        className="cursor-pointer size-4"
        data-tooltip-id="node-page"
        onClick={() => setNodePage(nodePage == id ? "" : id)}
      />
      <Tooltip id="node-page" className="!text-sm !px-3">
        Open page
      </Tooltip>
      <div className="border-r border-gray h-5"></div>
      <ScanEye
        className="cursor-pointer size-4"
        data-tooltip-id="quick-view"
        onClick={() => showQuickView(id)}
      />
      <Tooltip id="quick-view" className="!text-sm !px-3">
        Quick View
      </Tooltip>
      <div className="border-r border-gray h-5"></div>
      <div className="size-4 flex items-center justify-center" data-tooltip-id="node-color">
        <div className="cursor-pointer size-3 rounded-lg border-gray-1 border border-dashed"></div>
      </div>
      <Tooltip id="node-color" className="!text-sm !px-3">
        Color
      </Tooltip>
      <div className="border-r border-gray h-5"></div>
      <Menubar unstyled>
        <MenubarMenu>
          <MenubarTrigger unstyled>
            <div
              className="size-4 flex items-center justify-center"
              data-tooltip-id="node-progress"
            >
              <div className="cursor-pointer text-sm">{data?.progress}%</div>
            </div>
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
      <Tooltip id="node-progress" className="!text-sm !px-3">
        Progress
      </Tooltip>
    </div>
  );
};

export default HoverMenu;
