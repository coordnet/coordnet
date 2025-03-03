import { Skill } from "@coordnet/core";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Edit, Ellipsis, Play, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { deleteSkill } from "@/api";
import { getProfileCardImage, getProfileImage } from "@/components/Profiles/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks";

import SkillManage from "./SkillManage";
import SkillPermissions from "./SkillPermissions";

const SkillCard = ({ skill, className }: { skill: Skill; className?: string }) => {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const showControls =
    skill.authors.map((a) => a.id).includes(profile?.id ?? "") ||
    skill?.creator?.id.includes(profile?.id ?? "");

  const onDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this skill? This cannot be undone.") &&
      id
    ) {
      await deleteSkill(id);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    }
  };

  useEffect(() => {
    if ((permissionsModalOpen || editModalOpen) && isMenuOpen) {
      setIsHovered(false);
    }
  }, [permissionsModalOpen, editModalOpen, isMenuOpen]);

  return (
    <div
      className={clsx(
        `group relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200
        bg-white`,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showControls && (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <div
              className={clsx(
                `absolute right-2 top-2 size-5 cursor-pointer items-center justify-center rounded-md
                bg-white`,
                {
                  hidden: !(isHovered || isMenuOpen),
                  flex: isHovered || isMenuOpen,
                }
              )}
            >
              <Ellipsis className="size-3" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={clsx("rounded-md border border-neutral-200 bg-white shadow-lg", {
              hidden: !(isHovered || isMenuOpen),
              block: isHovered || isMenuOpen,
            })}
          >
            <DropdownMenuItem
              className="flex cursor-pointer items-center px-4 py-2 font-medium text-neutral-700
                hover:bg-gray-100"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit className="mr-2 size-4" /> Edit Skill
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex cursor-pointer items-center px-4 py-2 font-medium text-neutral-700
                hover:bg-gray-100"
              onClick={() => setPermissionsModalOpen(true)}
            >
              <Settings2 className="mr-2 size-4" /> Manage Permissions
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex cursor-pointer items-center px-4 py-2 font-medium text-red-500
                hover:bg-gray-100"
              onClick={() => onDelete(skill.id)}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog onOpenChange={setEditModalOpen} open={editModalOpen}>
        <DialogContent className="w-[430px] p-0">
          {skill.id && <SkillManage skill={skill} setOpen={setEditModalOpen} />}
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setPermissionsModalOpen} open={permissionsModalOpen}>
        <DialogContent className="w-[430px] p-0">
          {skill?.id && <SkillPermissions id={skill?.id} key={skill.id} />}
        </DialogContent>
      </Dialog>

      <Link to={`/skills/${skill.id}`}>
        <div
          className="h-20 w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${getProfileCardImage(skill, true, true)}")` }}
        ></div>
        <div className="relative z-10 flex flex-1 flex-col gap-1 p-2">
          <div
            className="inline-block w-fit rounded-[4px] bg-blue-50 px-2 py-1 text-[11px] font-medium
              leading-none text-neutral-500"
          >
            Skill
          </div>
          <h2 className="line-clamp-2 text-sm font-bold leading-tight text-black">
            {skill.title ?? "Untitled"}
          </h2>
          <div className="-mt-1 line-clamp-2 py-0.5 text-xs font-normal text-neutral-500">
            {skill.description}
          </div>
        </div>
      </Link>

      {Boolean(skill.creator) && (
        <Link
          to={`/profiles/${skill.creator?.profile_slug}`}
          className="mt-auto flex items-center gap-1 pb-2 pl-2 pr-2 text-xs font-medium
            text-neutral-500 hover:text-neutral-600"
        >
          <div
            className="mr-0.5 size-4 flex-shrink-0 rounded-full bg-gray-400 bg-cover bg-center"
            style={{
              backgroundImage: `url("${getProfileImage(skill.creator)}")`,
            }}
          ></div>
          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            @{skill.creator?.profile_slug}
          </span>
          <span>&middot;</span>
          <div className="mr-1 flex items-center">
            <Play className="mr-0.5 size-3 text-neutral-500" />
            {skill.run_count}
          </div>
        </Link>
      )}
    </div>
  );
};

export default SkillCard;
