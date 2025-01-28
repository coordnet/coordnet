import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { getSkillVersions } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYDoc } from "@/hooks";
import { SkillVersion, YDocScope } from "@/types";

const SkillVersions = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { versionId } = useParams();
  const { parent, scope } = useYDoc();

  const { data: versions, isFetched } = useQuery({
    queryKey: ["skills", parent.id, "versions"],
    queryFn: ({ signal }) => getSkillVersions(signal, parent?.id ?? ""),
    enabled: Boolean(parent.id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const currentVersion = versions?.results?.find((version) => version.id === versionId);
  const latestVersion: SkillVersion | null =
    versions.results.length > 0
      ? versions.results.reduce((prev, current) =>
          prev.version > current.version ? prev : current
        )
      : null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={readOnly}>
        {(versionId || (isFetched && versions.count > 0)) && (
          <div
            className={clsx(
              `flex h-7 items-center justify-center gap-2 rounded-full bg-gradient-to-r
              from-violet-50 to-blue-50 px-4 py-1 text-sm font-medium text-neutral-700`,
              scope == YDocScope.READ_ONLY && "!py-5"
            )}
          >
            {versionId && currentVersion ? (
              <>
                Version {currentVersion.version}
                {scope === YDocScope.READ_ONLY && (
                  <div className="text-sm text-gray-5">
                    {format(new Date(currentVersion.created_at), "dd MMM yyyy")}
                  </div>
                )}
              </>
            ) : latestVersion?.version ? (
              <>
                Version {latestVersion.version + 1}
                <div className="text-sm text-gray-5">Draft</div>
              </>
            ) : (
              `Versions (${versions.count})`
            )}

            {isFetched && versions.count > 0 && !readOnly && (
              <ChevronDown className="-mr-2 size-4" />
            )}
          </div>
        )}
      </DropdownMenuTrigger>
      {isFetched && versions.count > 0 && (
        <DropdownMenuContent
          forceMount
          side="top"
          sideOffset={8}
          className="flex max-h-[125px] flex-col overflow-auto"
        >
          {scope === YDocScope.READ_WRITE && latestVersion?.version && (
            <Link to={`/skills/${parent.id}`} className="block cursor-pointer">
              <DropdownMenuItem
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-3",
                  !versionId && "bg-neutral-100 font-semibold"
                )}
              >
                <div className="flex items-center gap-1">Version {latestVersion.version + 1}</div>
                <div className="text-sm text-gray-5">Draft</div>
              </DropdownMenuItem>
            </Link>
          )}
          {[...versions.results].reverse().map((version) => (
            <Link
              to={`/skills/${parent.id}/versions/${version.id}`}
              className="block cursor-pointer"
              key={version.id}
            >
              <DropdownMenuItem
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-3",
                  versionId == version.id && "bg-neutral-100 font-semibold"
                )}
              >
                <div className="flex items-center gap-1">Version {version.version}</div>
                <div className="text-sm text-gray-5">
                  {format(new Date(version.created_at), "dd/MM/yy HH:mm")}
                </div>
              </DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default SkillVersions;
