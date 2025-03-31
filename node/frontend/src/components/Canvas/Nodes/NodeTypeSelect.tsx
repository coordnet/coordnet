import { CanvasNode, NodeType, nodeTypeMap } from "@coordnet/core";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

const NodeTypeSelect = ({
  id,
  data,
  className,
}: {
  id: string;
  data: CanvasNode["data"];
  className?: string;
}) => {
  const { parent, scope } = useYDoc();
  const { nodesMap } = useCanvas();
  const isSkill = parent.type === BackendEntityType.SKILL;

  const setType = (type: NodeType) => {
    const node = nodesMap?.get(id);
    if (node) {
      nodesMap?.set(id, { ...node, data: { ...node.data, type } });
    }
  };

  if (!isSkill) return <></>;

  const shouldSkipType = (type: NodeType) => {
    return type === NodeType.PaperQA || type === NodeType.ExternalData;
  };

  const nodeTypeBadge = (
    <div
      className={clsx(
        `nodrag flex h-3 items-center rounded-full bg-violet-200 px-1.5 text-[8px] font-bold
        text-neutral-600`,
        scope === YDocScope.READ_WRITE && "cursor-pointer"
      )}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {nodeTypeMap[data.type as NodeType] || "Default"}
      </div>
      {scope === YDocScope.READ_WRITE && (
        <ChevronDown className="size-2 flex-shrink-0 pl-0.5 text-black" strokeWidth={4} />
      )}
    </div>
  );

  return (
    <div className={clsx("nodrag absolute left-1 top-1 z-10", className)}>
      {scope === YDocScope.READ_WRITE ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>{nodeTypeBadge}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
            <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-semibold">
              Node Type
            </DropdownMenuLabel>
            {Object.values(NodeType).map((value) => {
              if (shouldSkipType(value)) return null;
              return (
                <DropdownMenuItem
                  key={value}
                  className="flex cursor-pointer items-center text-sm font-medium capitalize
                    text-neutral-700"
                  onClick={() => setType(value)}
                >
                  <div className="mr-1 size-5">
                    {value === data.type ||
                      (!data.type && value === NodeType.Default && <Check className="size-4" />)}
                  </div>
                  {nodeTypeMap[value]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : data?.type && data?.type !== NodeType.Default ? (
        nodeTypeBadge
      ) : null}
    </div>
  );
};

export default NodeTypeSelect;
