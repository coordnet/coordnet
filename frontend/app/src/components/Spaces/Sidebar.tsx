import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { ChevronsLeft, Loader2, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getSpaces } from "@/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SheetClose } from "@/components/ui/sheet";
import { useSpace } from "@/hooks";
import useUser from "@/hooks/useUser";
import { metaKey } from "@/utils";

import { Button } from "../ui/button";
import Manage from "./Manage";

const SpaceSidebar = ({ open }: { open: boolean }) => {
  const navigate = useNavigate();
  const [manageSpaceOpen, setManageSpaceOpen] = useState<boolean>(false);
  const [manageSpaceId, setManageSpaceId] = useState<string | null>(null);
  const { space: currentSpace } = useSpace();
  const { user, isLoading: userLoading } = useUser();
  const { data: spaces, isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  const icon = blockies.create({ seed: user?.email }).toDataURL();

  useEffect(() => {
    const validKeys = spaces?.results.map((_, i) => i + 1);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && validKeys?.includes(Number(e.key)) && open) {
        e.preventDefault();
        const index = Number(e.key) - 1;
        if (spaces && index >= 0 && index < spaces.count) {
          navigate(`/spaces/${spaces?.results[index]?.id}`);
        }
      }
    };

    if (spaces && spaces.count > 0) {
      document.addEventListener("keydown", onKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, navigate, spaces]);

  return (
    <>
      <div className="flex items-center gap-2 text-sm font-medium px-3 py-2">
        {!userLoading && <img src={icon} className="rounded-full size-5" />}
        {user?.name || user?.email}
        {/* <Button variant="ghost" className="p-1 h-auto">
          <Settings2 className="size-4" />
        </Button> */}
        <SheetClose asChild>
          <Button variant="ghost" className="p-1 h-auto ml-auto">
            <ChevronsLeft className="size-4" />
          </Button>
        </SheetClose>
      </div>
      <div className="border-t mx-2 py-2">
        <h3 className="text-sm font-semibold py-1 px-2">Spaces</h3>
        {isLoading ? (
          <div className="p-4 flex justify-center items-center">
            Loading <Loader2 className="size-4 ml-3 animate-spin" />
          </div>
        ) : (
          <ul>
            {spaces?.results.map((space, i) => {
              // const icon = blockies.create({ seed: space?.id }).toDataURL();
              return (
                <li
                  key={`spaces-${space?.id}`}
                  className={clsx(
                    "text-sm font-medium rounded p-2 hover:bg-neutral-100 cursor-pointer group",
                    { "bg-violet-100": space?.id == currentSpace?.id },
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
                        className="ml-auto text-sm text-neutral-700 group-hover:block hidden p-0 pl-3 h-auto"
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
        <DialogContent className="p-0 w-[430px]">
          {manageSpaceId && (
            <Manage id={manageSpaceId} setOpen={setManageSpaceOpen} key={manageSpaceId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpaceSidebar;
