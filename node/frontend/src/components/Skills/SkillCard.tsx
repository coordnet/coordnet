import { Skill } from "@coordnet/core";
import clsx from "clsx";
import { Ellipsis, GitFork, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { getProfileCardImage, getProfileImage } from "@/components/Profiles/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import SkillActionsDropdown from "./SkillActionsDropdown";

const SkillCard = ({
  skill,
  disableInteraction = false,
  className,
}: {
  skill: Skill;
  disableInteraction?: boolean;
  className?: string;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      {!disableInteraction && (
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
            <SkillActionsDropdown skill={skill} variant="card" />
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link
        to={`/skills/${skill.id}`}
        className={clsx(disableInteraction ? "pointer-events-none" : "cursor-pointer")}
      >
        <div
          className="h-20 w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${getProfileCardImage(skill, true, true)}")` }}
        ></div>
        <div className="relative z-10 flex flex-1 flex-col gap-1 p-2">
          <div className="flex items-center gap-1">
            <div
              className="inline-flex h-5 w-fit items-center rounded-[4px] bg-blue-100 px-2 py-1
                text-[11px] font-medium leading-none text-neutral-600"
            >
              Skill
            </div>
            {skill?.forked_from && (
              <Link
                to={`/skills/${skill.forked_from.method}/versions/${skill.forked_from.id}`}
                className="inline-flex h-5 w-fit items-center rounded-[4px]
                  bg-profile-modal-gradient px-2 py-1 text-[11px] font-medium leading-none
                  text-neutral-600 hover:text-neutral-700"
              >
                <GitFork className="mr-1 size-3" />
                Forked
              </Link>
            )}
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
