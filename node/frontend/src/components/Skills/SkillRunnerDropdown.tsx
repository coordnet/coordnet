import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Play, Share } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";

import { getSkill } from "@/api";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const SkillRunnerDropdown = ({
  skillId,
  variant,
  className,
}: {
  skillId?: string;
  variant: "copy" | "navigate";
  className?: string;
}) => {
  const navigate = useNavigate();
  const { data, error, isLoading } = useQuery({
    queryKey: ["skills", skillId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getSkill(signal, skillId),
    enabled: Boolean(skillId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const cantShare = !isLoading && !data?.latest_version?.id;
  const url = `/skills-runner/${skillId}/${data?.latest_version?.id}`;

  const handleClick = () => {
    if (cantShare) return;

    if (variant == "copy") {
      const toastId = toast.loading("Copying Skill Runner URL...");
      try {
        navigator.clipboard.writeText(window.location.origin + url);
        toast.success("Skill runner URL copied to clipboard!", { id: toastId });
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error("Error copying to clipboard", { id: toastId });
      }
    }

    if (variant == "navigate") {
      navigate(url);
    }
  };

  return (
    <>
      <DropdownMenuItem
        className={clsx(
          "flex cursor-pointer items-center font-medium text-neutral-700",
          cantShare && "cursor-default text-neutral-400 hover:!bg-white hover:!text-neutral-400",
          className
        )}
        onClick={handleClick}
        disabled={isLoading || error !== null}
        data-tooltip-id={`skill-runner-tooltip-${variant}`}
        data-tooltip-place="right"
      >
        {variant == "copy" ? (
          <>
            <Share className="mr-2 size-4" /> Copy Skill Runner URL
          </>
        ) : (
          <>
            <Play className="mr-2 size-4" /> Open Skill Runner
          </>
        )}
      </DropdownMenuItem>
      {cantShare && (
        <Tooltip id={`skill-runner-tooltip-${variant}`} className="max-w-[300px]">
          In order to use the Skill Runner there must be a published version available.
        </Tooltip>
      )}
    </>
  );
};
export default SkillRunnerDropdown;
