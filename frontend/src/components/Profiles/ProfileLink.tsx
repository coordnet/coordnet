import clsx from "clsx";
import { Tooltip } from "react-tooltip";

import { profilesIconMap } from "./constants";

const ProfileLink = ({
  link,
  type,
  className,
}: {
  link: string;
  type: keyof typeof profilesIconMap;
  className?: string;
}) => {
  const Icon =
    type in profilesIconMap
      ? profilesIconMap[type].component
      : profilesIconMap["website"].component;
  const tootltip =
    type in profilesIconMap
      ? profilesIconMap[type].title
      : type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <a href={link} target="_blank" rel="noreferrer" aria-label={tootltip}>
      <div
        className={clsx(
          "size-10 bg-violet-600 rounded-full flex items-center justify-center text-white hover:bg-violet-800",
          className,
        )}
        data-tooltip-id={`icon-${type}-tooltip`}
        data-tooltip-content={tootltip}
        data-tooltip-place="bottom"
      >
        <Icon className="size-4" />
        <Tooltip id={`icon-${type}-tooltip`} />
      </div>
    </a>
  );
};

export default ProfileLink;
