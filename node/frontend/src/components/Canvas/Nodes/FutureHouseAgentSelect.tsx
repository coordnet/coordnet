import { CanvasNode, NodeType } from "@coordnet/core";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

// Predefined list of available FutureHouse agents (excluding 'dummy')
const FUTUREHOUSE_AGENTS = [
  { id: "job-futurehouse-paperqa2", name: "Crow" },
  { id: "job-futurehouse-paperqa2-deep", name: "Falcon" },
  { id: "job-futurehouse-hasanyone", name: "Owl" },
  { id: "job-futurehouse-phoenix", name: "Phoenix" },
  { id: "job-futurehouse-data-analysis-crow-high", name: "Finch" },
  { id: "job-futurehouse-chimp", name: "Chimp" },
];

const FutureHouseAgentSelect = ({
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

  const selected = FUTUREHOUSE_AGENTS.find((agent) => agent.id === data.futureHouseAgent);

  const setAgent = (agentId: string) => {
    const node = nodesMap?.get(id);
    if (node) {
      nodesMap?.set(id, { ...node, data: { ...node.data, futureHouseAgent: agentId } });
    }
  };

  useEffect(() => {
    if (!data?.futureHouseAgent && FUTUREHOUSE_AGENTS.length > 0) {
      const node = nodesMap?.get(id);
      if (node) {
        nodesMap?.set(id, {
          ...node,
          data: { ...node.data, futureHouseAgent: FUTUREHOUSE_AGENTS[0].id },
        });
      }
    }
  }, [data?.futureHouseAgent, id, nodesMap]);

  if (!isSkill || (data?.type !== NodeType.PaperQA && data?.type !== NodeType.FutureHouse))
    return <></>;

  const agentBadge = (
    <div
      className={clsx(
        `nodrag flex h-3 items-center rounded-full bg-blue-200 px-1.5 text-[8px] font-bold
        text-neutral-600`,
        scope === YDocScope.READ_WRITE && "cursor-pointer"
      )}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap capitalize">
        {selected?.name || "Select Agent"}
      </div>
      {scope === YDocScope.READ_WRITE && (
        <ChevronDown className="size-2 flex-shrink-0 pl-0.5 text-black" strokeWidth={4} />
      )}
    </div>
  );

  return (
    <div className={clsx("nodrag absolute bottom-1 right-1 z-10", className)}>
      {scope === YDocScope.READ_WRITE ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>{agentBadge}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
            <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-semibold">
              FutureHouse Agent
            </DropdownMenuLabel>
            {FUTUREHOUSE_AGENTS.map((agent) => {
              return (
                <DropdownMenuItem
                  key={agent.id}
                  className="flex cursor-pointer items-center text-sm font-medium capitalize
                    text-neutral-700"
                  onClick={() => setAgent(agent.id)}
                >
                  <div className="mr-1 size-5">
                    {agent.id === data.futureHouseAgent && <Check className="size-4" />}
                  </div>
                  {agent.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        agentBadge
      )}
    </div>
  );
};

export default FutureHouseAgentSelect;
