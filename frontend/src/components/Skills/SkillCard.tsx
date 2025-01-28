import clsx from "clsx";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";

import { getProfileCardImage, getProfileImage } from "@/components/Profiles/utils";
import { Skill } from "@/types";

const SkillCard = ({ skill, className }: { skill: Skill; className?: string }) => {
  return (
    <div
      className={clsx(
        `relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200
        bg-white`,
        className
      )}
    >
      <Link to={`/skills/${skill.id}`}>
        <div
          className={clsx("h-20 w-full bg-cover bg-center")}
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
