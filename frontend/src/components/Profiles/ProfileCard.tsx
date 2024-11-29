import clsx from "clsx";
import { Link } from "react-router-dom";

import { ProfileCard as ProfileCardType } from "@/types";

import bannerPlaceholder from "./assets/banner-placeholder.svg?url";
import { getProfileImage } from "./utils";

const ProfileCard = ({ card, className }: { card: ProfileCardType; className?: string }) => {
  const thumbnail = card?.image_thumbnail_2x ? card?.image_thumbnail_2x : bannerPlaceholder;

  return (
    <div
      className={clsx(
        "rounded-lg overflow-hidden relative border border-neutral-200 bg-white flex flex-col h-full",
        className,
      )}
    >
      <div
        className={clsx("w-full h-20 bg-cover bg-center")}
        style={{ backgroundImage: `url("${thumbnail}")` }}
      ></div>
      <div className="p-2 z-10 relative flex flex-col gap-1 flex-1">
        <div className="text-neutral-500 text-[11px] font-medium bg-blue-50 leading-none py-1 px-2 rounded-[4px] inline-block w-fit">
          Method
        </div>
        <h2 className="text-black text-sm font-bold line-clamp-2 leading-tight">{card.title}</h2>
        <div className="line-clamp-2 text-neutral-500 text-xs font-normal -mt-1 py-0.5">
          {card.description}
        </div>
        <Link
          to={`/profiles/${card.author_profile?.profile_slug}`}
          className="flex items-center gap-1 text-neutral-500 font-medium text-xs mt-auto hover:text-neutral-600"
        >
          <div
            className="size-4 bg-gray-400 rounded-full mr-0.5 flex-shrink-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${getProfileImage(card.author_profile)}")`,
            }}
          ></div>
          <span className="max-w-full text-ellipsis overflow-hidden whitespace-nowrap">
            @{card.author_profile?.profile_slug}
          </span>
          {/* <span>&middot;</span>
              <div className="flex items-center">
                <Play className="size-4 text-neutral-500 mr-1" />
                102k
              </div> */}
        </Link>
      </div>
    </div>
  );
};

export default ProfileCard;
