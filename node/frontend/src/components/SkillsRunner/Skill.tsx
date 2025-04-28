import { Skill as SkillType } from "@coordnet/core";
import clsx from "clsx";
import { Bot, Check, ChevronDown } from "lucide-react";
import { useParams } from "react-router-dom";

import line from "@/assets/line-1.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useBuddy from "@/hooks/useBuddy";

import SkillCard from "../Skills/SkillCard";

export const Skill = ({ skill }: { skill?: SkillType }) => {
  const { buddy, buddies, buddyId, setBuddyId } = useBuddy();
  const { runId } = useParams();

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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={Boolean(runId)}>
          <div
            className={clsx(
              `mt-4 flex w-48 items-center gap-2 rounded-full border border-neutral-200 bg-white
              px-3 py-2.5`,
              !runId && "cursor-pointer"
            )}
          >
            <Bot className="size-4 text-neutral-500" />
            <div
              className="flex-1 justify-start truncate text-sm font-medium text-neutral-900"
              title={`${buddy?.name} (${buddy?.model})`}
            >
              {buddy?.name} ({buddy?.model})
            </div>
            {!runId && <ChevronDown className="size-4 text-neutral-500" />}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
          <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-semibold">
            Buddy
          </DropdownMenuLabel>
          {buddies?.results?.map((b) => {
            return (
              <DropdownMenuItem
                key={`node-buddy-${b.id}`}
                className="flex cursor-pointer items-center text-sm font-medium text-neutral-700"
                onClick={() => setBuddyId(b.id)}
                title={b?.system_message}
              >
                <div className="mr-1 size-5">{b.id == buddyId && <Check className="size-4" />}</div>
                {b?.name} ({b?.model})
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
