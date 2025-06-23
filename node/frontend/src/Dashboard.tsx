import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { ChevronsRight, ExternalLink, Loader as LoaderIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { getSkills, getSpaces } from "@/api";
import shadowsBg from "@/components/Profiles/assets/shadows.svg";
import SpaceSidebar from "@/components/Spaces/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import useUser from "@/hooks/useUser";

import { Loader } from "./components";
import { getProfileImage } from "./components/Profiles/utils";
import SkillManage from "./components/Skills/SkillManage";
import SkillsList from "./components/Skills/SkillsList";
import { Dialog, DialogTrigger } from "./components/ui/dialog";
import { title } from "./lib/utils";

function Dashboard() {
  const { user, isGuest, isLoading: userLoading, profile } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  const filteredSpaces = spaces?.results.filter(
    (space) => !(space.is_public && !space.allowed_actions.includes("manage"))
  );

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: ({ signal }) => getSkills(signal, { public: true, show_permissions: true }),
    enabled: Boolean(user),
  });

  const usersSkills = skills?.results.filter(
    (skill) =>
      skill.authors?.map((a) => a.id).includes(profile?.id ?? "") ||
      skill?.creator?.id.includes(profile?.id ?? "") ||
      skill?.is_public === false
  );
  const publicSkills = skills?.results.filter(
    (skill) => skill.is_public && !usersSkills?.map((s) => s.id).includes(skill.id)
  );

  useEffect(() => {
    if (!userLoading && isGuest) window.location.href = "/auth/login";
  }, [isGuest, userLoading]);

  useEffect(() => {
    title("Dashboard");
  }, []);

  if (userLoading || spacesLoading || skillsLoading || skillsLoading || !profile)
    return <Loader message="Loading" />;

  return (
    <div className={clsx("flex h-full w-full overflow-auto bg-profile-gradient pt-10")}>
      <div className="absolute left-3 top-3 z-30 flex items-center">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="mr-2 size-9 flex-shrink-0 p-0 shadow-node-repo">
              <ChevronsRight strokeWidth={2.8} className="size-4 text-neutral-500" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <SpaceSidebar open={sidebarOpen} />
          </SheetContent>
        </Sheet>

        <Link
          to={`/profiles/${profile?.profile_slug}`}
          className="flex w-full items-center font-normal text-black hover:text-black"
          data-tooltip-id="profile-dropdown-edit"
          data-tooltip-place="bottom"
        >
          <Button variant="outline" className="h-9 gap-2 px-2 py-0 shadow-node-repo">
            {userLoading || !profile ? (
              <LoaderIcon className="size-4 animate-spin text-neutral-500" />
            ) : (
              <img src={getProfileImage(profile)} className="size-5 rounded-full" />
            )}
            Profile
          </Button>
        </Link>

        <Tooltip id="profile-dropdown-edit">Edit Profile</Tooltip>
      </div>

      <div
        className="absolute left-1/2 top-[211px] z-10 w-[60%] -translate-x-1/2 transform
          select-none"
      >
        <img src={shadowsBg} className="select-none" draggable="false" />
      </div>

      <div
        className={clsx(
          "z-30 mx-auto mt-10 w-[90%] max-w-[640px] rounded-lg",
          usersSkills?.length == 0 && publicSkills?.length == 0 && filteredSpaces?.length == 0
            ? "mt-32"
            : ""
        )}
      >
        <img src="/static/coordination-network-logo-bw.png" className="m-auto h-9" />
        <div className="my-11 text-center text-3xl font-normal">
          Welcome back
          {profile?.title?.length ? ", " + profile?.title?.split(" ")[0] : ""}!
        </div>

        <div className="mb-9 flex items-center justify-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="h-9 bg-violet-600 px-3 hover:bg-violet-700"
                data-tooltip-id="dashboard-create-button"
                data-tooltip-place="bottom"
              >
                <Plus className="mr-1 size-5" /> Create Skill
              </Button>
            </DialogTrigger>
            <SkillManage />
          </Dialog>
          {/* <Tooltip id="dashboard-create-button">Build a Skill</Tooltip> */}
          <a
            href="https://github.com/orgs/coordnet/discussions/categories/skill-requests"
            rel="noreferrer"
            target="_blank"
          >
            <Button
              variant="outline"
              className="h-9 text-neutral-800"
              data-tooltip-id="dashboard-request-button"
              data-tooltip-place="bottom"
            >
              <ExternalLink className="mr-2 size-3.5" /> Request a Skill
            </Button>
          </a>
          {/* <Tooltip id="dashboard-request-button">Request a skill to be made</Tooltip> */}
        </div>

        {Boolean(usersSkills && usersSkills.length > 0) && (
          <SkillsList header="Skills" skills={usersSkills} />
        )}
        {Boolean(publicSkills && publicSkills.length > 0) && (
          <SkillsList header="Network Skills" skills={publicSkills} className="mt-14" />
        )}

        {Boolean(filteredSpaces && filteredSpaces.length > 0) && (
          <>
            <div className="mb-3 mt-14 flex items-center justify-between">
              <div className="text-xl font-medium leading-7 text-black">Spaces</div>
            </div>

            <div
              className="grid grid-cols-1 gap-4 pb-20 min-[480px]:grid-cols-2
                min-[640px]:grid-cols-3"
            >
              {filteredSpaces?.map((space, i) => {
                const spaceIcon = blockies
                  .create({ seed: space?.id, size: 10, scale: 20 })
                  .toDataURL();

                return (
                  <Link to={`/spaces/${space.id}`} key={i}>
                    <div
                      className={clsx(
                        `relative flex h-full flex-col overflow-hidden rounded-lg border
                        border-neutral-200 bg-white`
                      )}
                    >
                      <div
                        className={clsx("h-20 w-full bg-cover bg-center opacity-75")}
                        style={{ backgroundImage: `url("${spaceIcon}")` }}
                      ></div>
                      <div className="relative z-10 flex flex-1 flex-col gap-1 p-2">
                        <div
                          className="inline-block w-fit rounded-[4px] bg-blue-50 px-2 py-1
                            text-[11px] font-medium leading-none text-neutral-500"
                        >
                          Space
                        </div>
                        <h2 className="line-clamp-2 text-sm font-bold leading-tight text-black">
                          {space.title ?? "Untitled"}
                        </h2>
                        <div
                          className="mt-auto line-clamp-2 py-0.5 text-xs font-normal
                            text-neutral-500"
                        >
                          {space.node_count.toLocaleString()} node
                          {space.node_count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
