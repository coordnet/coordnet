import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import { ChevronsRight, CircleUserRound, Edit, Orbit, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { getProfileCards, getProfileFromUsername, getSpace } from "@/api";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUser from "@/hooks/useUser";
import { title } from "@/lib/utils";

import Loader from "../Loader";
import SpaceSidebar from "../Spaces/Sidebar";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import badge from "./assets/badge.webp";
import shadowsBg from "./assets/shadows.svg";
import { profilesIconMap } from "./constants";
import EditProfile from "./EditProfile";
import ProfileCardFind from "./ProfileCardFind";
import ProfileCardManage from "./ProfileCardManage";
import ProfileLink from "./ProfileLink";
import ProfileSkillCard from "./ProfileSkillCard";
import ProfileSkillCardExpanded from "./ProfileSkillCardExpanded";
import { getProfileBannerImage, getProfileImage } from "./utils";

const Profile = ({ className }: { className?: string }) => {
  const { username } = useParams();
  const { user, isGuest } = useUser();

  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);
  const [profileCardManageOpen, setProfileCardManageOpen] = useState<boolean>(false);
  const [findProfileCardOpen, setFindProfileCardOpen] = useState<boolean>(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profiles", username],
    queryFn: ({ signal }) => getProfileFromUsername(signal, username!),
    enabled: Boolean(username),
    refetchInterval: false,
    retry: false,
    throwOnError: true,
  });

  const { data: space } = useQuery({
    queryKey: ["spaces", profile?.space],
    queryFn: ({ signal }) => getSpace(signal, profile?.space ?? ""),
    enabled: Boolean(profile && profile.space && !isGuest),
    refetchInterval: false,
    retry: false,
  });

  // @ts-expect-error we just want to load
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: cards } = useQuery({
    queryKey: ["profile-cards"],
    queryFn: ({ signal }) => getProfileCards(signal),
    enabled: Boolean(username),
    refetchInterval: false,
    retry: false,
  });

  useEffect(() => {
    if (username) title(`@${username}`);
  }, [username]);

  const isSpace = Boolean(profile?.space);
  // const isUser = Boolean(profile?.user);
  const isOwner = profile?.user
    ? user?.id == profile?.user
    : profile?.space && space
      ? space.allowed_actions.includes("manage")
      : false;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const banner = getProfileBannerImage(profile, true);

  return (
    <div className={clsx("h-full w-full overflow-auto bg-profile-gradient", className)}>
      <div
        className="absolute left-1/2 top-[211px] z-10 w-[60%] -translate-x-1/2 transform
          select-none"
      >
        <img src={shadowsBg} className="select-none" draggable="false" />
      </div>
      <div className="absolute left-3 top-3 z-30">
        {isGuest ? (
          <>
            <Button
              asChild
              variant="outline"
              className="size-9 p-0 shadow-node-repo"
              data-tooltip-id="login"
              data-tooltip-content="Log In"
              data-tooltip-place="bottom"
            >
              <Link to={`/auth/login?redirect=${encodeURIComponent(`/profiles/${username}`)}`}>
                <CircleUserRound strokeWidth={2.8} className="size-4 text-neutral-500" />
              </Link>
            </Button>

            <Tooltip id="login" />
          </>
        ) : (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="size-9 p-0 shadow-node-repo">
                <ChevronsRight strokeWidth={2.8} className="size-4 text-neutral-500" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <SpaceSidebar open={sidebarOpen} />
            </SheetContent>
          </Sheet>
        )}
      </div>
      {profileLoading ? (
        <Loader message="Loading profile..." />
      ) : (
        <>
          <div className="relative z-20 m-auto w-[90%] max-w-[1200px] pt-10">
            <div
              className="flex h-[200px] items-end justify-center rounded-2xl bg-cover bg-center
                md:h-[320px]"
              style={{ backgroundImage: `url("${banner}")` }}
            >
              <div
                className="-mb-5 size-40 rounded-full border-4 border-[#e7ebfe] bg-cover bg-center
                  md:-mb-8 md:size-48"
                style={{ backgroundImage: `url("${getProfileImage(profile, true)}")` }}
              ></div>
              {isOwner && profile && (
                <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="absolute -right-3 top-3 h-8 p-0 px-2 text-sm font-medium text-black
                        shadow-node-repo md:-bottom-12 md:right-0 md:top-auto"
                    >
                      <Edit strokeWidth={2.8} className="mr-2 size-4 text-neutral-500" /> Edit
                      profile
                    </Button>
                  </DialogTrigger>
                  <EditProfile profile={profile} setOpen={setEditProfileOpen} />
                </Dialog>
              )}
            </div>
          </div>
          <div className="relative z-20 m-auto mb-20 mt-9 w-[90%] max-w-[640px] md:mt-14">
            <h1 className="flex items-center justify-center text-3xl font-semibold text-black">
              {profile?.title}
              <div
                className="ml-3 hidden size-10 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url("${badge}")` }}
                data-tooltip-id="profile-badge"
                data-tooltip-content="Epoch 1 Badge"
                data-tooltip-place="bottom"
              ></div>
            </h1>
            <Tooltip id="profile-badge" />
            <div
              className="mt-4 flex flex-wrap justify-center gap-1 text-base font-normal
                text-neutral-500"
            >
              <span>@{profile?.profile_slug}</span>
              {profile?.object_created ? (
                <>
                  <span>&middot;</span>
                  <span>joined {format(new Date(profile?.object_created), "y")}</span>
                </>
              ) : (
                <></>
              )}
              {Boolean(profile?.cards.length ?? 0 > 0) && (
                <>
                  <span>&middot;</span>
                  <span>
                    {profile?.cards.length} skill{(profile?.cards.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </>
              )}
              {Boolean(profile?.eth_address) && (
                <>
                  <span>&middot;</span>
                  <span
                    className="cursor-default"
                    data-tooltip-id="eth-address"
                    data-tooltip-content={profile?.eth_address}
                    data-tooltip-place="bottom"
                    data-tooltip-class-name="font-mono"
                  >
                    {profile?.eth_address?.slice(0, 7)}&hellip;{profile?.eth_address?.slice(-5)}
                  </span>
                  <Tooltip id="eth-address" />
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2.5">
              {Object.keys(profilesIconMap).map((type, i) => {
                const key = type as keyof typeof profilesIconMap;
                if (profile && profile[key]) {
                  return (
                    <ProfileLink
                      link={profile[key]}
                      className="mt-5"
                      type={key}
                      key={`profile-social-${i}`}
                    />
                  );
                }
              })}
            </div>
            {Boolean(profile?.description) && (
              <div className="mt-4 p-4 text-center text-sm font-normal">{profile?.description}</div>
            )}

            {Boolean(isSpace && profile?.members.length) && (
              <div className="mx-1 mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className="flex items-center text-sm font-bold leading-tight text-neutral-600"
                  >
                    <Users className="m-2 mr-4 size-4 text-neutral-500" />
                    Members
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 py-2">
                  {profile?.members
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((user, i) => (
                      <Link to={`/profiles/${user.profile_slug}`} key={`members-${user.id}-${i}`}>
                        <div
                          className="size-14 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${getProfileImage(user, true)}")` }}
                          data-tooltip-id={`members-${user.id}`}
                          data-tooltip-content={user.title}
                          data-tooltip-place="bottom"
                        ></div>
                        <Tooltip id={`members-${user.id}`} />
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {(Boolean(profile?.cards.length) || isOwner) && (
              <div className="mx-1 mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className="flex items-center text-sm font-bold leading-tight text-neutral-600"
                  >
                    <Orbit className="m-2 mr-4 size-4 text-neutral-500" />
                    Skills
                  </div>
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-6 bg-violet-700 px-2 text-xs hover:bg-violet-800">
                          <Plus className="-ml-0.5 mr-1 size-3" /> Add
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="z-90">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setProfileCardManageOpen(true)}
                        >
                          Create new
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setFindProfileCardOpen(true)}
                        >
                          Add existing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div
                  className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3"
                >
                  {profile?.cards
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((card, i) => (
                      <Dialog key={`profile-card-${card.id}-${i}`}>
                        <DialogTrigger className="text-left">
                          <ProfileSkillCard className="cursor-pointer" card={card} />
                        </DialogTrigger>
                        {profile && <ProfileSkillCardExpanded profile={profile} card={card} />}
                      </Dialog>
                    ))}
                  {Boolean(isOwner && profile?.cards.length === 0) && (
                    <>
                      <div
                        className="flex h-48 cursor-pointer items-center justify-center rounded-lg
                          border border-dashed border-violet-600"
                        onClick={() => setProfileCardManageOpen(true)}
                      >
                        <Button className="w-fit bg-violet-700 hover:bg-violet-800">
                          <Plus className="mr-1 size-4" /> Create Skill
                        </Button>
                      </div>
                      <div className="h-48 rounded-lg border border-dashed border-neutral-300"></div>
                      <div className="h-48 rounded-lg border border-dashed border-neutral-300"></div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20 m-auto w-[90%] max-w-[1200px] py-10">
            <a
              href="https://www.coordination.network/welcome"
              target="_blank"
              rel="noreferrer"
              className="m-auto block w-fit"
            >
              <img src="/static/coordination-network-logo-bw.png" className="m-auto h-9" />
            </a>
          </div>
        </>
      )}
      <Dialog open={profileCardManageOpen} onOpenChange={setProfileCardManageOpen}>
        {profile && <ProfileCardManage profile={profile} setOpen={setProfileCardManageOpen} />}
      </Dialog>
      <Dialog open={findProfileCardOpen} onOpenChange={setFindProfileCardOpen}>
        {profile && <ProfileCardFind profile={profile} setOpen={setFindProfileCardOpen} />}
      </Dialog>
    </div>
  );
};

export default Profile;
