import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import { ChevronDown, Globe, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

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

const SkillRunHistory = ({ versionId, className }: { versionId?: string; className?: string }) => {
  const { runId } = useParams();
  const location = useLocation();
  const { parent } = useYDoc();
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"all" | "mine" | "shared" | "public">("all");
  const isSkill = parent.type === BackendEntityType.SKILL;

  const getFilters = () => {
    switch (selectedTab) {
      case "mine":
        return { own_runs: true };
      case "shared":
        return { own_runs: false };
      case "public":
        return { is_public: true };
      default:
        return undefined;
    }
  };
  console.log(["skills", parent.id, "runs", selectedTab]);

  const { data: runsData, isFetched } = useQuery({
    queryKey: ["skills", parent.id, "runs", selectedTab],
    queryFn: ({ signal }) => getSkillRuns(signal, parent?.id ?? "", getFilters()),
    enabled: Boolean(parent.id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const runs = versionId
    ? runsData.results.filter((r) => r.method_version == versionId)
    : runsData.results;

  const filteredRuns = runs;

  const isRunner = location.pathname.includes("skills-runner");

  if (!isSkill) return <></>;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {(runId || isFetched) && (
          <div
            className={clsx(
              `flex h-7 items-center justify-center rounded-full bg-gradient-to-r from-violet-50
              to-blue-50 px-4 py-1 text-sm font-medium text-neutral-700`,
              className
            )}
          >
            {runId ? `Run ${formatSkillRunId(runId)}` : `History (${filteredRuns.length})`}
            {isFetched && <ChevronDown className="-mr-2 ml-1 size-4 text-neutral-500" />}
          </div>
        )}
      </DropdownMenuTrigger>
      {isFetched && (
        <DropdownMenuContent side="top" sideOffset={8} className="w-[320px] p-0">
          <div className="flex">
            <button
              onClick={() => setSelectedTab("all")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors",
                selectedTab === "all"
                  ? "border-b-2 border-violet-700 text-violet-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTab("mine")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors",
                selectedTab === "mine"
                  ? "border-b-2 border-violet-700 text-violet-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              My runs
            </button>
            <button
              onClick={() => setSelectedTab("shared")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors",
                selectedTab === "shared"
                  ? "border-b-2 border-violet-700 text-violet-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Shared
            </button>
            <button
              onClick={() => setSelectedTab("public")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors",
                selectedTab === "public"
                  ? "border-b-2 border-violet-700 text-violet-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Public
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredRuns.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No{" "}
                {selectedTab === "all"
                  ? ""
                  : selectedTab === "mine"
                    ? "runs created by you"
                    : selectedTab === "shared"
                      ? "shared runs"
                      : "public runs"}{" "}
                found
              </div>
            ) : (
              [...filteredRuns].reverse().map((run) => (
                <Link
                  to={
                    isRunner
                      ? `/skills-runner/${parent.id}/${run.method_version}/${run.id}`
                      : `/skills/${parent.id}/${run.method_version ? `versions/${run.method_version}/` : ""}runs/${run.id}`
                  }
                  key={run.id}
                  className="block text-neutral-700"
                >
                  <DropdownMenuItem
                    key={run.id}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between gap-3",
                      runId == run.id && "bg-neutral-100 font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-1">Run {formatSkillRunId(run.id)}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-5">
                        {format(new Date(run.created_at), "dd/MM/yy HH:mm")}
                      </div>
                      {run.is_public ? (
                        <Globe
                          className="h-3.5 w-3.5 text-neutral-400"
                          data-tooltip-id="public-tooltip"
                          data-tooltip-content="Public"
                        />
                      ) : run.is_shared ? (
                        <Users
                          className="h-3.5 w-3.5 text-neutral-400"
                          data-tooltip-id="shared-tooltip"
                          data-tooltip-content="Shared with users"
                        />
                      ) : (
                        <div className="size-3.5"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                </Link>
              ))
            )}
          </div>
          <Tooltip id="public-tooltip" place="left" />
          <Tooltip id="shared-tooltip" place="left" />
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default SkillRunHistory;
