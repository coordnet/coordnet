import { CanvasNode, NodeType } from "@coordnet/core";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect } from "react";

import { listPaperQACollections } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

const PaperQACollectionsSelect = ({
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

  const { data: collections } = useQuery({
    queryKey: ["skills"],
    queryFn: ({ signal }) => listPaperQACollections(signal),
    initialData: { count: 0, next: "", previous: "", results: [] },
    enabled: Boolean(data?.type === NodeType.PaperQACollection),
  });

  const selected = collections.results.find((value) => value.id === data.paperQACollection);

  const setType = (type: string) => {
    const node = nodesMap?.get(id);
    if (node) {
      nodesMap?.set(id, { ...node, data: { ...node.data, paperQACollection: type } });
    }
  };

  useEffect(() => {
    if (!data?.paperQACollection && collections.results.length > 0) {
      const node = nodesMap?.get(id);
      if (node) {
        nodesMap?.set(id, {
          ...node,
          data: { ...node.data, paperQACollection: collections.results[0].id },
        });
      }
    }
  }, [collections.results, data?.paperQACollection, id, nodesMap]);

  if (!isSkill || data?.type !== NodeType.PaperQACollection) return <></>;

  const collectionBadge = (
    <div
      className={clsx(
        `nodrag flex h-3 items-center rounded-full bg-violet-200 px-1.5 text-[8px] font-bold
        text-neutral-600`,
        scope === YDocScope.READ_WRITE && "cursor-pointer"
      )}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap capitalize">
        {selected?.name}
      </div>
      {scope === YDocScope.READ_WRITE && (
        <ChevronDown className="size-2 flex-shrink-0 pl-0.5 text-black" strokeWidth={4} />
      )}
    </div>
  );

  return (
    <div className={clsx("nodrag absolute bottom-1 left-1 z-10", className)}>
      {scope === YDocScope.READ_WRITE ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>{collectionBadge}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
            <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-semibold">
              Collection
            </DropdownMenuLabel>
            {collections.results.map((value) => {
              return (
                <DropdownMenuItem
                  key={value.id}
                  className="flex cursor-pointer items-center text-sm font-medium capitalize
                    text-neutral-700"
                  onClick={() => setType(value.id)}
                >
                  <div className="mr-1 size-5">
                    {value.id === data.paperQACollection && <Check className="size-4" />}
                  </div>
                  {value.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        collectionBadge
      )}
    </div>
  );
};

export default PaperQACollectionsSelect;
