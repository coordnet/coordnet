import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import { ChevronsRight, CircleUserRound, Edit, Orbit, Plus, Users } from "lucide-react";
import { useState } from "react";
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

import Loader from "../Loader";
import SpaceSidebar from "../Spaces/Sidebar";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import badge from "./assets/badge.webp";
import shadowsBg from "./assets/shadows.svg";
import { profilesIconMap } from "./constants";
import EditProfile from "./EditProfile";
import ProfileCard from "./ProfileCard";
import ProfileCardExpanded from "./ProfileCardExpanded";
import ProfileCardFind from "./ProfileCardFind";
import ProfileCardManage from "./ProfileCardManage";
import ProfileLink from "./ProfileLink";
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
    <div className={clsx("bg-profile-gradient h-full overflow-auto w-full", className)}>
      <div className="absolute w-[60%] left-1/2 transform -translate-x-1/2 top-[211px] select-none z-10">
        <img src={shadowsBg} className="select-none" draggable="false" />
      </div>
      <div className="absolute top-3 left-3 z-30">
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
          <div className="pt-10 max-w-[1200px] w-[90%] m-auto z-20 relative">
            <div
              className="h-[200px] md:h-[320px] rounded-2xl flex items-end justify-center bg-cover bg-center"
              style={{ backgroundImage: `url("${banner}")` }}
            >
              <div
                className="size-40 md:size-48 rounded-full -mb-5 md:-mb-8 bg-cover bg-center border-4 border-[#e7ebfe]"
                style={{ backgroundImage: `url("${getProfileImage(profile, true)}")` }}
              ></div>
              {isOwner && profile && (
                <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="p-0 shadow-node-repo text-black text-sm font-medium h-8 px-2 absolute -right-3 md:right-0 top-3 md:top-auto md:-bottom-12"
                    >
                      <Edit strokeWidth={2.8} className="size-4 text-neutral-500 mr-2" /> Edit
                      profile
                    </Button>
                  </DialogTrigger>
                  <EditProfile profile={profile} setOpen={setEditProfileOpen} />
                </Dialog>
              )}
            </div>
          </div>
          <div className="z-20 relative max-w-[640px] w-[90%] m-auto mt-9 md:mt-14 mb-20">
            <h1 className="text-black text-3xl font-semibold flex items-center justify-center">
              {profile?.title}
              <div
                className="size-10 ml-3 rounded-full bg-cover bg-center hidden"
                style={{ backgroundImage: `url("${badge}")` }}
                data-tooltip-id="profile-badge"
                data-tooltip-content="Epoch 1 Badge"
                data-tooltip-place="bottom"
              ></div>
            </h1>
            <Tooltip id="profile-badge" />
            <div className="text-neutral-500 text-base font-normal flex gap-1 justify-center mt-4 flex-wrap">
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
                    {profile?.cards.length} method{(profile?.cards.length ?? 0) > 1 ? "s" : ""}
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
              <div className="p-4 mt-4 text-sm text-center font-normal">{profile?.description}</div>
            )}

            {Boolean(isSpace && profile?.members.length) && (
              <div className="mt-6 mx-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-neutral-600 text-sm font-bold leading-tight">
                    <Users className="size-4 text-neutral-500 m-2 mr-4" />
                    Members
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap py-2">
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
              <div className="mt-6 mx-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-neutral-600 text-sm font-bold leading-tight">
                    <Orbit className="size-4 text-neutral-500 m-2 mr-4" />
                    Methods
                  </div>
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-violet-700 h-6 px-2 text-xs hover:bg-violet-800">
                          <Plus className="size-3 mr-1 -ml-0.5" /> Add
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

                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4 min-[640px]:grid-cols-3">
                  {profile?.cards
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((card, i) => (
                      <Dialog key={`profile-card-${card.id}-${i}`}>
                        <DialogTrigger className="text-left">
                          <ProfileCard className="cursor-pointer" card={card} />
                        </DialogTrigger>
                        {profile && <ProfileCardExpanded profile={profile} card={card} />}
                      </Dialog>
                    ))}
                  {Boolean(isOwner && profile?.cards.length === 0) && (
                    <>
                      <div
                        className="h-48 cursor-pointer rounded-lg flex items-center justify-center border border-violet-600 border-dashed"
                        onClick={() => setProfileCardManageOpen(true)}
                      >
                        <Button className="bg-violet-700 w-fit hover:bg-violet-800">
                          <Plus className="size-4 mr-1" /> Create Method
                        </Button>
                      </div>
                      <div className="h-48 rounded-lg border border-neutral-300 border-dashed"></div>
                      <div className="h-48 rounded-lg border border-neutral-300 border-dashed"></div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="max-w-[1200px] w-[90%] m-auto relative py-10 ">
            <a href="https://www.coordination.network/welcome" target="_blank" rel="noreferrer">
              <img src="/static/coordination-network-logo-bw.png" className="h-9 m-auto" />
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
