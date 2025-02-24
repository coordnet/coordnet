import { Skill } from "@coordnet/core";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Edit, EllipsisVertical, Home, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteSkill } from "@/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useYDoc } from "@/hooks";
import { BackendEntityType } from "@/types";

import { Loader } from "../";
import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import SkillManage from "./SkillManage";
import SkillPermissions from "./SkillPermissions";

const Header = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const { runId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();

  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || parent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  const skill = parent.type === BackendEntityType.SKILL ? parent.data : undefined;
  const skillTitle = skill?.title ?? "Untitled";

  const canEdit =
    skill?.authors.map((a) => a.id).includes(profile?.id ?? "") ||
    skill?.creator?.id.includes(profile?.id ?? "");

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

  return (
    <div
      className={clsx(
        `absolute left-3 top-3 z-30 flex items-center gap-2 rounded border border-neutral-200
        bg-white p-2 shadow-node-repo`,
        className
      )}
    >
      <Link to="/">
        <Button variant="outline" className="flex size-9 items-center rounded px-3">
          <Home className="size-4 flex-shrink-0 text-neutral-500" />
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center" disabled={!canEdit}>
          <>
            <div className="px-3 text-lg font-medium text-black">{skillTitle}</div>
            {canEdit && (
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
  );
};
export default Header;
