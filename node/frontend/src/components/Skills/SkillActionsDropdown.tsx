import { Skill } from "@coordnet/core";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Edit, GitFork, Settings2, Trash2 } from "lucide-react";

import { deleteSkill } from "@/api";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks";

import useModal, { ModalType } from "@/hooks/useModal";
import SkillRunnerDropdown from "./SkillRunnerDropdown";

interface SkillActionsDropdownProps {
  skill: Skill;
  onNavigate?: () => void; // Optional callback for navigation after deletion
  variant?: "header" | "card"; // To handle slight styling differences
}

const SkillActionsDropdown = ({
  skill,
  onNavigate,
  variant = "card",
}: SkillActionsDropdownProps) => {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const { openModal } = useModal();

  const canEdit =
    skill.authors.map((a) => a.id).includes(profile?.id ?? "") ||
    skill?.creator?.id.includes(profile?.id ?? "");

  const onDelete = async () => {
    if (
      window.confirm("Are you sure you want to delete this skill? This cannot be undone") &&
      skill?.id
    ) {
      await deleteSkill(skill.id);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      if (onNavigate) {
        onNavigate();
      }
    }
  };

  // Styling based on variant
  const menuItemBaseClass = clsx(
    "flex cursor-pointer items-center font-medium text-neutral-700",
    variant !== "header" && "px-4 py-2 hover:bg-gray-100"
  );

  const deleteItemClass = clsx(
    "flex cursor-pointer items-center font-medium text-red-500",
    variant !== "header" && "px-4 py-2 hover:bg-gray-100"
  );

  const runnerDropdownClass = variant === "header" ? "" : "px-4 py-2";

  if (!canEdit) {
    return (
      <>
        <SkillRunnerDropdown
          variant="navigate"
          skillId={skill.id}
          className={runnerDropdownClass}
        />
        <SkillRunnerDropdown variant="copy" skillId={skill.id} className={runnerDropdownClass} />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={clsx(
            "flex cursor-pointer items-center font-medium text-neutral-700",
            variant !== "header" && "px-4 py-2 hover:bg-gray-100"
          )}
          onClick={() => openModal(ModalType.SKILL_FORK, { skillId: skill.id })}
        >
          <GitFork className="mr-2 size-4" /> Fork Skill
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <>
      <SkillRunnerDropdown variant="navigate" skillId={skill.id} className={runnerDropdownClass} />
      <SkillRunnerDropdown variant="copy" skillId={skill.id} className={runnerDropdownClass} />

      <DropdownMenuSeparator />

      <DropdownMenuItem
        className={menuItemBaseClass}
        onClick={() => openModal(ModalType.SKILL_FORK, { skillId: skill.id })}
      >
        <GitFork className="mr-2 size-4" /> Fork Skill
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        className={menuItemBaseClass}
        onClick={() => openModal(ModalType.SKILL_EDIT, { skill })}
      >
        <Edit className="mr-2 size-4" /> Edit Skill
      </DropdownMenuItem>

      <DropdownMenuItem
        className={menuItemBaseClass}
        onClick={() => openModal(ModalType.SKILL_PERMISSIONS, { skillId: skill.id })}
      >
        <Settings2 className="mr-2 size-4" /> Manage Permissions
      </DropdownMenuItem>

      <DropdownMenuItem className={deleteItemClass} onClick={onDelete}>
        <Trash2 className="mr-2 size-4" /> Delete
      </DropdownMenuItem>
    </>
  );
};

export default SkillActionsDropdown;
