import clsx from "clsx";
import { Loader } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUser from "@/hooks/useUser";

import { getProfileImage } from "./utils";

const ProfileDropdownButton = ({ className }: { className?: string }) => {
  const { logout, user, profile, isLoading: userLoading } = useUser();

  return (
    !userLoading &&
    user && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={clsx("size-9 p-0", className)}>
            {userLoading || !profile ? (
              <Loader className="size-4 animate-spin text-neutral-500" />
            ) : (
              <img src={getProfileImage(profile)} className="size-5 rounded-full" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {profile && (
            <DropdownMenuItem className="cursor-pointer">
              <Link
                to={`/profiles/${profile?.profile_slug}`}
                className="flex w-full items-center font-normal text-black hover:text-black"
              >
                <img src={getProfileImage(profile)} className="mr-2 size-4 rounded-full" />
                Your Profile
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer" onClick={logout}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  );
};

export default ProfileDropdownButton;
