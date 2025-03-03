import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSkillRuns } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYDoc } from "@/hooks";
import { BackendEntityType } from "@/types";

import { formatSkillRunId } from "./utils";

const SkillRunHistory = () => {
  const { runId } = useParams();
  const { parent } = useYDoc();
  const [open, setOpen] = useState(false);
  const isSkill = parent.type === BackendEntityType.SKILL;

  const { data: runs, isFetched } = useQuery({
    queryKey: ["skills", parent.id, "runs"],
    queryFn: ({ signal }) => getSkillRuns(signal, parent?.id ?? ""),
    enabled: Boolean(parent.id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  if (!isSkill) return <></>;

  return (
    <DropdownMenu modal={true} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {(runId || (isFetched && runs.count > 0)) && (
          <div
            className="flex h-7 items-center justify-center rounded-full bg-gradient-to-r
              from-violet-50 to-blue-50 px-4 py-1 text-sm font-medium text-neutral-700"
          >
            {runId ? `Run ${formatSkillRunId(runId)}` : `History (${runs.count})`}
            {isFetched && runs.count > 0 && <ChevronDown className="-mr-2 ml-1 size-4" />}
          </div>
        )}
      </DropdownMenuTrigger>
      {isFetched && runs.count > 0 && (
        <DropdownMenuContent
          side="top"
          sideOffset={8}
          className="flex max-h-[125px] flex-col overflow-auto"
        >
          {[...runs.results].reverse().map((run) => (
            <Link
              to={`/skills/${parent.id}/${run.method_version ? `versions/${run.method_version}/` : ""}runs/${run.id}`}
              key={run.id}
              className="block"
            >
              <DropdownMenuItem
                key={run.id}
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-3",
                  runId == run.id && "bg-neutral-100 font-semibold"
                )}
              >
                <div className="flex items-center gap-1">
                  Run <pre>{formatSkillRunId(run.id)}</pre>
                </div>
                {/* Show date & time */}
                <div className="text-sm text-gray-5">
                  {format(new Date(run.created_at), "dd/MM/yy HH:mm")}
                </div>

                {/* <div className="text-sm text-gray-5">{formatTimeAgo(run.created_at)}</div> */}
              </DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default SkillRunHistory;
