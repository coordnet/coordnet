import { Buddy, CanvasNode, NodeType } from "@coordnet/core";
import clsx from "clsx";
import { Bot, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType, YDocScope } from "@/types";

const BuddySelect = ({
  id,
  data,
  className,
}: {
  id: string;
  data: CanvasNode["data"];
  className?: string;
}) => {
  const { parent, scope } = useYDoc();
  const { buddy, buddies } = useBuddy();
  const { nodesMap } = useCanvas();

  const isSkill = parent.type === BackendEntityType.SKILL;
  const buddyName = data?.buddy ? data?.buddy?.name : buddy?.name;

  const setBuddy = (buddy?: Buddy) => {
    const node = nodesMap?.get(id);
    if (node) {
      nodesMap?.set(id, { ...node, data: { ...node?.data, buddy } });
    }
  };

  if (!isSkill || data?.type !== NodeType.Prompt) return <></>;

  const buddyBadge = (
    <div
      className={clsx(
        "nodrag flex h-3 items-center rounded-full bg-purple/10 px-1.5 text-[10px] text-purple",
        scope === YDocScope.READ_WRITE && "cursor-pointer"
      )}
      data-tooltip-id="llm-buddy"
    >
      <Bot className="mr-1 size-2.5" />
      <div className="max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">
        {buddyName}
      </div>
    </div>
  );

  return (
    <div className={clsx("nodrag absolute bottom-1 left-1 z-10", className)}>
      {scope === YDocScope.READ_WRITE ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>{buddyBadge}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
            <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-semibold">
              Buddy
            </DropdownMenuLabel>
            <DropdownMenuItem
              key="node-buddy-default"
              className="flex cursor-pointer items-center text-sm font-medium capitalize
                text-neutral-700"
              onClick={() => setBuddy(undefined)}
            >
              <div className="mr-1 size-5">
                {data.buddy === undefined && <Check className="size-4" />}
              </div>
              Default Skill Buddy ({buddy?.name})
            </DropdownMenuItem>
            {buddies?.results?.map((b) => {
              return (
                <DropdownMenuItem
                  key={`node-buddy-${b.id}`}
                  className="flex cursor-pointer items-center text-sm font-medium capitalize
                    text-neutral-700"
                  onClick={() => setBuddy(b)}
                  title={b?.system_message}
                >
                  <div className="mr-1 size-5">
                    {b.id == data?.buddy?.id && <Check className="size-4" />}
                  </div>
                  {b?.name} ({b?.model})
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        buddyBadge
      )}
    </div>
  );
};

export default BuddySelect;
