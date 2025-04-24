import { Skill as SkillType } from "@coordnet/core";

import line from "@/assets/line-1.svg";

import SkillCard from "../Skills/SkillCard";

export const Skill = ({ skill }: { skill?: SkillType }) => {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-neutral-400">Skill Card</h2>
      <div className="flex flex-row gap-6">
        <div className="relative">
          {skill && (
            <SkillCard
              skill={skill}
              disableInteraction={true}
              className="z-1 relative !h-52 w-48 shadow-lg"
            />
          )}
        </div>
        <img src={line} alt="line" className="flex-shrink-0" />
      </div>
    </div>
  );
};
