import { Skill } from "@coordnet/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Edit, EllipsisVertical, Home, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteSkill, deleteSkillRun, getPermissions } from "@/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useYDoc } from "@/hooks";
import { BackendEntityType, PermissionModel } from "@/types";

import { Loader } from "../";
import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import SkillManage from "./SkillManage";
import SkillPermissions from "./SkillPermissions";
import SkillRunnerDropdown from "./SkillRunnerDropdown";
import SkillRunPermissions from "./SkillRunPermissions";
import { formatSkillRunId } from "./utils";

const Header = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { profile, user } = useUser();
  const queryClient = useQueryClient();
  const { runId, skillId, versionId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();

  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [runPermissionsModalOpen, setRunPermissionsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const canEditSkill =
    skill?.authors.map((a) => a.id).includes(profile?.id ?? "") ||
    skill?.creator?.id.includes(profile?.id ?? "");
  const canEditRun = ownPermissions?.role?.toLowerCase() === "owner";

  const onDelete = async () => {
    if (
      window.confirm("Are you sure you want to delete this skill? This cannot be undone") &&
      parent?.data
    ) {
      await deleteSkill(parent?.data.id);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      navigate("/");
    }
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
          <DropdownMenuTrigger className="flex items-center" disabled={!canEditSkill}>
            <>
              <div className="px-3 text-lg font-medium text-black">{skillTitle}</div>
              {canEditSkill && (
                <Button variant="ghost" className="flex size-6 items-center rounded px-3">
                  <EllipsisVertical className="size-4 flex-shrink-0 text-neutral-500" />
                </Button>
              )}
            </>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="flex cursor-pointer items-center font-medium text-neutral-700"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit className="mr-2 size-4" /> Edit Skill
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center font-medium text-neutral-700"
              onClick={() => setPermissionsModalOpen(true)}
            >
              <Settings2 className="mr-2 size-4" /> Manage Permissions
            </DropdownMenuItem>

            <SkillRunnerDropdown variant="navigate" skillId={skill?.id} />
            <SkillRunnerDropdown variant="copy" skillId={skill?.id} />

            <DropdownMenuItem
              className="flex cursor-pointer items-center font-medium text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog onOpenChange={setEditModalOpen} open={editModalOpen}>
          <DialogContent className="w-[430px] p-0">
            {parent?.data?.id && (
              <SkillManage skill={parent?.data as Skill} setOpen={setEditModalOpen} />
            )}
          </DialogContent>
        </Dialog>
        <Dialog onOpenChange={setPermissionsModalOpen} open={permissionsModalOpen}>
          <DialogContent className="w-[430px] p-0">
            {parent?.data?.id && <SkillPermissions id={parent?.data?.id} key={parent?.data.id} />}
          </DialogContent>
        </Dialog>
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
              <DropdownMenuItem
                className="flex cursor-pointer items-center font-medium text-neutral-700"
                onClick={() => setRunPermissionsModalOpen(true)}
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
          <Dialog onOpenChange={setRunPermissionsModalOpen} open={runPermissionsModalOpen}>
            <DialogContent className="w-[430px] p-0">
              <SkillRunPermissions id={runId} key={runId} />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};
export default Header;
