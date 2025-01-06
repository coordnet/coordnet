import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronsRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { getSpaces } from "@/api";
import { Loader } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import shadowsBg from "@/components/Profiles/assets/shadows.svg";
import SpaceSidebar from "@/components/Spaces/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import useUser from "@/hooks/useUser";
import { CustomError } from "@/lib/utils";

import ProfileDropdownButton from "./components/Profiles/ProfileDropdownButton";

function Dashboard() {
  const { user, isGuest, isLoading: userLoading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });
  console.log(user?.profile);

  useEffect(() => {
    if (!userLoading && isGuest) window.location.href = "/auth/login";
  }, [isGuest, userLoading]);

  if (userLoading || spacesLoading) return <Loader message="Loading" />;

  if (!spaces || spaces.count === 0)
    return <ErrorPage error={new CustomError({ code: "NO_SPACES", name: "", message: "" })} />;

  // return <Navigate to={`/spaces/${spaces?.results[0].id}`} replace />;

  return (
    <div className={clsx("flex h-full w-full overflow-auto bg-profile-gradient pt-10")}>
      <div className="absolute left-3 top-3 z-30 flex items-center">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="mr-2 size-9 p-0 shadow-node-repo">
              <ChevronsRight strokeWidth={2.8} className="size-4 text-neutral-500" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <SpaceSidebar open={sidebarOpen} />
          </SheetContent>
        </Sheet>
        <ProfileDropdownButton className="shadow-node-repo" />
      </div>
      <div
        className="absolute left-1/2 top-[211px] z-10 w-[60%] -translate-x-1/2 transform
          select-none"
      >
        <img src={shadowsBg} className="select-none" draggable="false" />
      </div>
      <div className="mx-auto mt-10 w-full max-w-[640px] rounded-lg">
        <img src="/static/coordination-network-logo-bw.png" className="m-auto h-9" />
        <div className="my-16 text-center text-3xl font-normal">
          Welcome back{", " + user?.name?.split(" ")[0] || ""}!
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xl font-medium leading-7 text-black">Methods</div>
          <Button variant="default" className="bg-violet-600 hover:bg-violet-700">
            <Plus className="mr-2 size-5" /> Create Method
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
