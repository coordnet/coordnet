import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { ChevronsRight, Loader } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import store from "store2";

import { getMe } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSpace } from "@/hooks";
import { cleanNodeTitle } from "@/utils";

import SpaceSidebar from "./Spaces/Sidebar";
import { Button } from "./ui/button";

const Header = ({ id, className }: { id: string; className?: string }) => {
  const { space: currentSpace, nodes, breadcrumbs } = useSpace();
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const userIcon = blockies.create({ seed: user?.email }).toDataURL();

  return (
    <>
      <div className={clsx("h-6 text-sm flex items-center px-3 gap-2", className)}>
        <Link
          to={`/spaces/${currentSpace?.id}`}
          className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
        >
          {currentSpace?.title}
        </Link>
        {Boolean(breadcrumbs.length > 0) && <div className="">&raquo;</div>}
        {breadcrumbs.map((id, index) => (
          <div key={id} className="flex items-center gap-2">
            <Link
              to={`/spaces/${currentSpace?.id}/${id}`}
              className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
            >
              {cleanNodeTitle(nodes.find((n) => n.id === id)?.title)}
            </Link>
            {index < breadcrumbs.length - 1 && <div className="">&raquo;</div>}
          </div>
        ))}
        {breadcrumbs[breadcrumbs.length - 1] !== id && id != currentSpace?.default_node && (
          <div className="flex items-center gap-2">
            <div className="">&raquo;</div>
            <Link
              to={`/spaces/${currentSpace?.id}/${id}`}
              className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
            >
              {cleanNodeTitle(nodes.find((n) => n.id === id)?.title)}
            </Link>
          </div>
        )}
      </div>

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
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                store.remove("coordnet-auth");
                window.location.href = "/auth/login";
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

export default Header;
