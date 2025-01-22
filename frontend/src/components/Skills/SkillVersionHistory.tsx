import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useParams } from "react-router-dom";
import { format as formatTimeAgo } from "timeago.js";

import { getSkillVersions } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas } from "@/hooks";
import { BackendEntityType } from "@/types";

import { formatSkillRunId } from "./utils";

const SkillVersionHistory = () => {
  const { versionId } = useParams();
  const { parent } = useCanvas();
  const isSkill = parent.type === BackendEntityType.SKILL;

  const { data: versions, isFetched } = useQuery({
    queryKey: ["skills", parent.id, "versions"],
    queryFn: ({ signal }) => getSkillVersions(signal, parent?.id ?? ""),
    enabled: Boolean(parent.id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  if (!isSkill) return <></>;

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        {(versionId || (isFetched && versions.count > 0)) && (
          <div
            className="flex h-7 items-center justify-center rounded-full bg-gradient-to-r
              from-violet-50 to-blue-50 px-4 py-1 text-sm font-medium text-neutral-700"
          >
            {versionId ? `Version ${formatSkillRunId(versionId)}` : `Versions (${versions.count})`}
            {isFetched && versions.count > 0 && <ChevronDown className="-mr-2 ml-1 size-4" />}
          </div>
        )}
      </DropdownMenuTrigger>
      {isFetched && versions.count > 0 && (
        <DropdownMenuContent side="top" sideOffset={8} className="max-h-[200px] overflow-auto">
          {versions.results.map((version) => (
            <DropdownMenuItem
              key={version.id}
              className={clsx(
                "flex items-center justify-between gap-3",
                versionId == version.id && "bg-neutral-100 font-semibold"
              )}
            >
              <div className="flex items-center gap-1">Version {version.version}</div>
              <div className="text-sm text-gray-5">{formatTimeAgo(version.created_at)}</div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default SkillVersionHistory;
