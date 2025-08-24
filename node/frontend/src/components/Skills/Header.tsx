import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { EllipsisVertical, Home, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteSkillRun, getPermissions } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useYDoc } from "@/hooks";
// import useModal, { ModalType } from "@/hooks/useModal"; // TODO: Re-enable when implementing skill run permissions modal
import { BackendEntityType, PermissionModel } from "@/types";

import { Loader } from "../";
import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import SkillActionsDropdown from "./SkillActionsDropdown";
import { formatSkillRunId } from "./utils";

const Header = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const queryClient = useQueryClient();
  // const { openModal } = useModal(); // TODO: Re-enable when implementing skill run permissions modal
  const { runId, skillId, versionId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();

  const { data: permissions } = useQuery({
    queryKey: ["skills", runId, "runs", "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, PermissionModel.SkillRun, runId),
    enabled: Boolean(runId),
    initialData: [],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const ownPermissions = permissions?.find((p) => p.user == user?.email);
  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || parent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  const skill = parent.type === BackendEntityType.SKILL ? parent.data : undefined;
  const isSharedSkillRun = !skill && runId;
  const skillTitle = skill?.title
    ? skill?.title
    : isSharedSkillRun
      ? `Run ${formatSkillRunId(runId)}`
      : "Untitled";

  const canEditRun = ownPermissions?.role?.toLowerCase() === "owner";

  const handleNavigateAfterDelete = () => {
    navigate("/");
  };

  const onDeleteRun = async () => {
    if (window.confirm("Are you sure you want to delete this skill run? This cannot be undone")) {
      await deleteSkillRun(runId!);
      queryClient.invalidateQueries({ queryKey: ["skills", skillId, "runs"] });
      navigate(`/skills/${skillId}${versionId ? `/versions/${versionId}` : ""}`);
    }
  };

  return (
    <div className="absolute left-3 top-3 z-30 flex gap-4">
      <div
        className={clsx(
          "flex items-center gap-2 rounded border border-neutral-200 bg-white p-2 shadow-node-repo",
          className
        )}
      >
        <Link to="/">
          <Button variant="outline" className="flex size-9 items-center rounded px-3">
            <Home className="size-4 flex-shrink-0 text-neutral-500" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center">
            <div className="px-3 text-lg font-medium text-black">{skillTitle}</div>
            <Button variant="ghost" className="flex size-6 items-center rounded px-3">
              <EllipsisVertical className="size-4 flex-shrink-0 text-neutral-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {skill && (
              <SkillActionsDropdown
                skill={skill}
                variant="header"
                onNavigate={handleNavigateAfterDelete}
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {runId && !isSharedSkillRun && (
        <div
          className={clsx(
            `flex items-center gap-2 rounded border border-neutral-200 bg-gradient-to-r
            from-violet-50 to-blue-50 p-2 shadow-node-repo`,
            className
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center" disabled={!canEditRun}>
              <>
                <div className="px-3 text-lg font-medium text-black">
                  Run {formatSkillRunId(runId)}
                </div>
                {canEditRun && (
                  <Button variant="ghost" className="flex size-6 items-center rounded px-3">
                    <EllipsisVertical className="size-4 flex-shrink-0 text-neutral-500" />
                  </Button>
                )}
              </>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {/* TODO: Add SKILL_RUN_PERMISSIONS modal type to useModal context */}
              <DropdownMenuItem
                className="flex cursor-pointer items-center font-medium text-neutral-700"
                onClick={() => {
                  // TODO: Implement skill run permissions modal
                  console.log("Skill run permissions not yet implemented with new modal system");
                }}
              >
                <Settings2 className="mr-2 size-4" /> Manage Run Permissions
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex cursor-pointer items-center font-medium text-red-500"
                onClick={onDeleteRun}
              >
                <Trash2 className="mr-2 size-4" /> Delete Run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
export default Header;
