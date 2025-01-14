import clsx from "clsx";
import { Link } from "react-router-dom";

import { getProfileCardImage, getProfileImage } from "@/components/Profiles/utils";
import { Method } from "@/types";

const MethodCard = ({ method, className }: { method: Method; className?: string }) => {
  return (
    <div
      className={clsx(
        `relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200
        bg-white`,
        className
      )}
    >
      <div
        className={clsx("h-20 w-full bg-cover bg-center")}
        style={{ backgroundImage: `url("${getProfileCardImage(method, true, true)}")` }}
      ></div>
      <div className="relative z-10 flex flex-1 flex-col gap-1 p-2">
        <div
          className="inline-block w-fit rounded-[4px] bg-blue-50 px-2 py-1 text-[11px] font-medium
            leading-none text-neutral-500"
        >
          Method
        </div>
        <h2 className="line-clamp-2 text-sm font-bold leading-tight text-black">
          {method.title ?? "Untitled"}
        </h2>
        <div className="-mt-1 line-clamp-2 py-0.5 text-xs font-normal text-neutral-500">
          {method.description}
        </div>
        {Boolean(method.creator) && (
          <Link
            to={`/profiles/${method.creator}`}
            className="mt-auto flex items-center gap-1 text-xs font-medium text-neutral-500
              hover:text-neutral-600"
          >
            <div
              className="mr-0.5 size-4 flex-shrink-0 rounded-full bg-gray-400 bg-cover bg-center"
              style={{
                // @ts-expect-error waiting for back-end
                backgroundImage: `url("${getProfileImage(method)}")`,
              }}
            ></div>
            <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              @{method.creator}
            </span>
            {/* <span>&middot;</span>
              <div className="flex items-center">
                <Play className="size-4 text-neutral-500 mr-1" />
                102k
              </div> */}
          </Link>
        )}
      </div>
    </div>
  );
};

export default MethodCard;
