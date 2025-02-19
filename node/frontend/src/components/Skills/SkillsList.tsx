import { Skill } from "@coordnet/core";
import clsx from "clsx";

import SkillCard from "./SkillCard";

const placeholderCount = (itemsCount: number) => {
  return itemsCount < 3 ? 3 - itemsCount : 0;
};
const SkillsList = ({
  header,
  skills,
  className,
}: {
  header: string;
  skills?: Skill[];
  className?: string;
}) => {
  return (
    <div className={clsx(className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xl font-medium leading-7 text-black">{header}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3">
        {skills?.map((skill) => <SkillCard key={`dashboard-skill-${skill.id}`} skill={skill} />)}

        {Array.from({ length: placeholderCount(skills?.length ?? 0) }).map((_, idx) => (
          <div
            key={`skill-placeholder-${idx}`}
            className="flex h-full min-h-[180px] rounded-lg border border-dashed border-neutral-300"
          ></div>
        ))}
      </div>
    </div>
  );
};

export default SkillsList;
