import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronsLeft, Loader2, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { getSpaces } from "@/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SheetClose } from "@/components/ui/sheet";
import useUser from "@/hooks/useUser";
import { metaKey } from "@/lib/utils";

import { getProfileImage } from "../Profiles/utils";
import { Button } from "../ui/button";
import Manage from "./Manage";

const SpaceSidebar = ({ open }: { open: boolean }) => {
  const navigate = useNavigate();
  const [manageSpaceOpen, setManageSpaceOpen] = useState<boolean>(false);
  const [manageSpaceId, setManageSpaceId] = useState<string | null>(null);
  const { spaceId } = useParams();
  const { user, profile } = useUser();
  const { data: spaces, isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  const filteredSpaces = spaces?.results.filter(
    (space) => !(space.is_public && !space.allowed_actions.includes("manage"))
  );

  useEffect(() => {
    const validKeys = filteredSpaces?.map((_, i) => i + 1);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && validKeys?.includes(Number(e.key)) && open) {
        e.preventDefault();
        const index = Number(e.key) - 1;
        if (filteredSpaces && index >= 0 && index < filteredSpaces.length) {
          navigate(`/spaces/${filteredSpaces[index]?.id}`);
        }
      }
    };

    if (filteredSpaces && filteredSpaces.length > 0) {
      document.addEventListener("keydown", onKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, navigate, filteredSpaces]);

  return (
    <div className="flex h-full flex-col p-2">
      <div className="flex items-center gap-2 px-1 pb-2 text-sm font-medium">
        <Link
          to={`/profiles/${profile?.profile_slug}`}
          className="flex items-center gap-2 text-black hover:text-black"
          data-tooltip-id="sidebar-user-profile"
          data-tooltip-place="bottom"
          data-tooltip-content="Your Profile"
          data-tooltip-class-name="text-xs py-1"
        >
          {profile && <img src={getProfileImage(profile)} className="size-5 rounded-full" />}
          {user?.name || user?.email}
          {/* <Button variant="ghost" className="p-1 h-auto">
          <Settings2 className="size-4" />
        </Button> */}
        </Link>
        <Tooltip id="sidebar-user-profile" />
        <SheetClose asChild>
          <Button variant="ghost" className="ml-auto h-auto p-1">
            <ChevronsLeft className="size-4" />
          </Button>
        </SheetClose>
      </div>
      <h3 className="border-t px-1 pb-2 pt-3 text-sm">
        <Link to="/" className="flex p-1 text-black hover:bg-neutral-100 hover:text-black">
          Your Dashboard
        </Link>
      </h3>
      <h3 className="border-t px-2 pb-1 pt-3 text-sm font-semibold">Spaces</h3>
      <div className="flex-grow overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading <Loader2 className="ml-3 size-4 animate-spin" />
          </div>
        ) : (
          <ul>
            {filteredSpaces?.map((space, i) => {
              // const icon = blockies.create({ seed: space?.id }).toDataURL();
              return (
                <li
                  key={`spaces-${space?.id}`}
                  className={clsx(
                    "group cursor-pointer rounded p-2 text-sm font-medium hover:bg-neutral-100",
                    { "bg-violet-100": space?.id == spaceId }
                  )}
                >
                  <Link
                    to={`/spaces/${space?.id}`}
                    className="flex items-center gap-2 text-neutral-700 hover:text-neutral-700"
                  >
                    {/* <img src={icon} className="size-4 rounded-full" />  */}
                    {space?.title}
                    <div
                      className={clsx("ml-auto text-sm text-neutral-400", {
                        "group-hover:hidden": space?.allowed_actions?.includes("write"),
                      })}
                    >
                      {metaKey(i + 1)}
                    </div>
                    {space?.allowed_actions?.includes("write") && (
                      <Button
                        variant="ghost"
                        className="ml-auto hidden h-auto p-0 pl-3 text-sm text-neutral-700
                          group-hover:block"
                        onClick={(e) => {
                          e.preventDefault();
                          setManageSpaceOpen(true);
                          setManageSpaceId(space?.id);
                        }}
                      >
                        <Settings2 className="size-4" />
                      </Button>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Dialog open={manageSpaceOpen} onOpenChange={setManageSpaceOpen}>
        <DialogContent className="w-[430px] p-0">
          {manageSpaceId && (
            <Manage id={manageSpaceId} setOpen={setManageSpaceOpen} key={manageSpaceId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceSidebar;
