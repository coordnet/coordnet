import * as blockies from "blockies-ts";
import clsx from "clsx";
import { ChevronsRight, Loader } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSpace } from "@/hooks";
import useUser from "@/hooks/useUser";
import { cleanNodeTitle } from "@/lib/nodes";

import SpaceSidebar from "./Spaces/Sidebar";
import { Button } from "./ui/button";

const Header = ({ id, className }: { id: string; className?: string }) => {
  const { logout, user, isGuest, isLoading: userLoading } = useUser();
  const { space: currentSpace, nodes, breadcrumbs } = useSpace();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const userIcon = blockies.create({ seed: user?.email }).toDataURL();

  return (
    <>
      <div className={clsx("h-6 text-sm flex items-center px-3 gap-2", className)}>
        <div className="max-w-[220px] truncate">
          <Link
            to={`/spaces/${currentSpace?.id}`}
            className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
          >
            {currentSpace?.title}
          </Link>
        </div>
        {Boolean(breadcrumbs.length > 0) && <div className="">&raquo;</div>}
        {breadcrumbs.map((id, index) => (
          <div key={id} className="flex items-center gap-2">
            <div className="max-w-[220px] truncate">
              <Link
                to={`/spaces/${currentSpace?.id}/${id}`}
                className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
              >
                {cleanNodeTitle(nodes.find((n) => n.id === id)?.title)}
              </Link>
              {index < breadcrumbs.length - 1 && <div className="">&raquo;</div>}
            </div>
          </div>
        ))}
        {breadcrumbs[breadcrumbs.length - 1] !== id && id != currentSpace?.default_node && (
          <div className="flex items-center gap-2">
            <div className="">&raquo;</div>
            <div className="max-w-[220px] truncate">
              <Link
                to={`/spaces/${currentSpace?.id}/${id}`}
                className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
              >
                {cleanNodeTitle(nodes.find((n) => n.id === id)?.title)}
              </Link>
            </div>
          </div>
        )}
      </div>

      {isGuest ? (
        <></>
      ) : (
        <div className="absolute top-6 left-2 z-30 flex h-9 leading-9 gap-2">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="size-9 p-0">
                <ChevronsRight strokeWidth={2.8} className="size-4 text-neutral-500" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <SpaceSidebar open={sidebarOpen} />
            </SheetContent>
          </Sheet>
          {!userLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="size-9 p-0">
                  {userLoading ? (
                    <Loader className="animate-spin size-4 text-neutral-500" />
                  ) : (
                    <img src={userIcon} className="rounded-full size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </>
  );
};

export default Header;
