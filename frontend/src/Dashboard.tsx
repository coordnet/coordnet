import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { ChevronsRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createSkill, getSkills, getSpaces } from "@/api";
import { Loader } from "@/components";
import shadowsBg from "@/components/Profiles/assets/shadows.svg";
import SpaceSidebar from "@/components/Spaces/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import useUser from "@/hooks/useUser";

import ProfileDropdownButton from "./components/Profiles/ProfileDropdownButton";
import SkillCard from "./components/Skills/SkillCard";
import { title } from "./lib/utils";

function Dashboard() {
  const navigate = useNavigate();
  const { user, isGuest, isLoading: userLoading, profile } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: ({ signal }) => getSkills(signal),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!userLoading && isGuest) window.location.href = "/auth/login";
  }, [isGuest, userLoading]);

  useEffect(() => {
    title("Dashboard");
  }, []);

  const onCreateSkill = async () => {
    if (!profile) return toast.error("Profile not found");
    const response = await createSkill({ authors: [profile.id] });
    navigate(`/skills/${response.id}`);
  };

  const placeholderCount = (itemsCount: number) => {
    return itemsCount < 3 ? 3 - itemsCount : 0;
  };

  if (userLoading || spacesLoading || skillsLoading || !profile)
    return <Loader message="Loading" />;

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

      <div className="z-30 mx-auto mt-10 w-[90%] max-w-[640px] rounded-lg">
        <img src="/static/coordination-network-logo-bw.png" className="m-auto h-9" />
        <div className="my-16 text-center text-3xl font-normal">
          Welcome back
          {profile?.title?.length ? ", " + profile?.title?.split(" ")[0] : ""}!
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-xl font-medium leading-7 text-black">Skills</div>
          <Button
            variant="default"
            className="h-8 bg-violet-600 px-2 hover:bg-violet-700"
            onClick={onCreateSkill}
          >
            <Plus className="mr-1 size-5" /> Create a Skill
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3">
          {skills?.results.map((skill) => (
            <SkillCard key={`dashboard-skill-${skill.id}`} skill={skill} />
          ))}

          {Array.from({ length: placeholderCount(skills?.results.length ?? 0) }).map((_, idx) => (
            <div
              key={`skill-placeholder-${idx}`}
              className="flex h-full min-h-[180px] rounded-lg border border-dashed
                border-neutral-300"
            ></div>
          ))}
        </div>

        <div className="mb-3 mt-14 flex items-center justify-between">
          <div className="text-xl font-medium leading-7 text-black">Spaces</div>
        </div>

        <div
          className="grid grid-cols-1 gap-4 pb-20 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3"
        >
          {spaces?.results.map((space, i) => {
            const spaceIcon = blockies.create({ seed: space?.id, size: 10, scale: 20 }).toDataURL();

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
                      className="inline-block w-fit rounded-[4px] bg-blue-50 px-2 py-1 text-[11px]
                        font-medium leading-none text-neutral-500"
                    >
                      Space
                    </div>
                    <h2 className="line-clamp-2 text-sm font-bold leading-tight text-black">
                      {space.title ?? "Untitled"}
                    </h2>
                    <div
                      className="mt-auto line-clamp-2 py-0.5 text-xs font-normal text-neutral-500"
                    >
                      {space.node_count.toLocaleString()} node
                      {space.node_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {Array.from({ length: placeholderCount(spaces?.results.length ?? 0) }).map((_, idx) => (
            <div
              key={`skill-placeholder-${idx}`}
              className="flex h-full min-h-[180px] rounded-lg border border-dashed
                border-neutral-300"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
