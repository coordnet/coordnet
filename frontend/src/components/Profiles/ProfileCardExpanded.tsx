import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Play, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { serializeError } from "serialize-error";
import { toast } from "sonner";

import { deleteProfileCard, updateProfileCards } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUser from "@/hooks/useUser";
import { Profile, ProfileCard as ProfileCardType } from "@/types";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import ProfileCardManage from "./ProfileCardManage";
import { getProfileCardImage, getProfileImage } from "./utils";

const ProfileCardExpanded = ({
  profile,
  card,
  className,
}: {
  profile: Profile;
  card: ProfileCardType;
  clickable?: boolean;
  className?: string;
}) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [editIsOpen, setEditIsOpen] = useState(false);

  const banner = getProfileCardImage(card, true);
  const canEdit = card?.author_profile?.user === user?.id || card?.created_by === user?.id;

  const onRemoveCard = async (id: string) => {
    const newCards = profile.cards.filter((card) => card.id !== id).map((card) => card.id);
    try {
      await updateProfileCards(profile.id, newCards);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile-cards"] });
    } catch (error) {
      const serializedError = serializeError(error);
      toast.error(serializedError.message);
    }
  };

  const onDeleteCard = async (id: string) => {
    try {
      await deleteProfileCard(id);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile-cards"] });
    } catch (error) {
      const serializedError = serializeError(error);
      toast.error(serializedError.message);
    }
  };

  return (
    <DialogContent
      className={clsx(
        "bg-white !rounded-lg w-[500px] max-w-[90%] max-h-[90%] overflow-auto p-0 outline-none border-none block",
        className,
      )}
      showCloseButton={false}
    >
      <div
        className={clsx("w-full h-[200px] bg-cover bg-center flex flex-col items-end rounded-t-lg")}
        style={{ backgroundImage: `url("${banner}")` }}
      >
        {canEdit ? (
          <div className="flex gap-2 mr-4 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-red-500 h-9 hover:bg-red-600 !ring-offset-0 !ring-0">
                  Delete
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-90">
                <DropdownMenuItem className="cursor-pointer" onClick={() => onRemoveCard(card.id)}>
                  Remove from your profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure? This action cannot be undone. This will remove the card from all profiles that are using it.",
                      )
                    ) {
                      onDeleteCard(card.id);
                    }
                  }}
                >
                  Delete for everyone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={editIsOpen} onOpenChange={setEditIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-700 h-9 hover:bg-violet-800 !ring-offset-0 !ring-0">
                  Edit
                </Button>
              </DialogTrigger>
              {profile && card && (
                <ProfileCardManage profile={profile} card={card} setOpen={setEditIsOpen} />
              )}
            </Dialog>
          </div>
        ) : (
          Boolean(profile.id === user?.profile) && (
            <Button
              className="bg-red-500 h-9 hover:bg-red-600 !ring-offset-0 !ring-0 mr-4 mt-4"
              onClick={() => onRemoveCard(card.id)}
            >
              Remove
            </Button>
          )
        )}
      </div>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="h-9 px-3 items-center bg-blue-50 rounded inline-flex text-neutral-600 text-sm font-medium leading-tight">
            Method
          </div>
          <div className="flex gap-2">
            {card.video_url && (
              <a href={card.video_url} target="_blank" rel="noreferrer">
                <Button className="bg-white border border-neutral-200 h-9 text-black hover:bg-gray-200">
                  <PlayCircle className="size-4 mr-1.5" /> Video
                </Button>
              </a>
            )}
            {Boolean(card.url && canEdit) && (
              <a href={card.url}>
                <Button className="bg-violet-700 h-9 hover:bg-violet-800">
                  <Play className="size-4 mr-1.5" /> Run
                </Button>
              </a>
            )}
          </div>
        </div>
        <h3 className="text-black text-3xl font-semibold leading-9">{card.title}</h3>
        <div className="flex items-center gap-2 text-neutral-500 font-normal text-base">
          {Boolean(card.author_profile) && (
            <Link
              to={`/profiles/${card.author_profile?.profile_slug}`}
              className="flex items-center gap-1 text-neutral-500 font-normal text-base hover:text-neutral-600 whitespace-nowrap text-ellipsis overflow-hidden"
            >
              <div
                className="size-4 bg-gray-400 rounded-full mr-0.5 flex-shrink-0 bg-cover bg-center "
                style={{ backgroundImage: `url("${getProfileImage(card.author_profile)}")` }}
              ></div>
              <span className="max-w-full text-ellipsis overflow-hidden">
                @{card.author_profile?.profile_slug}
              </span>
            </Link>
          )}
          {Boolean(card.space_profile) && (
            <>
              {Boolean(card.space_profile && card.author_profile) && <span>&middot;</span>}
              <Link
                to={`/profiles/${card.space_profile?.profile_slug}`}
                className="flex items-center gap-1 text-neutral-500 font-normal text-base hover:text-neutral-600 whitespace-nowrap text-ellipsis overflow-hidden"
              >
                <div
                  className="size-4 bg-gray-400 rounded-full mr-0.5 flex-shrink-0 bg-cover bg-center "
                  style={{ backgroundImage: `url("${getProfileImage(card.space_profile)}")` }}
                ></div>
                <span className="max-w-full text-ellipsis overflow-hidden">
                  @{card.space_profile?.profile_slug}
                </span>
              </Link>
            </>
          )}

          {/* <span>&middot;</span>
            <div className="flex items-center">
              <Play className="size-4 text-neutral-500 mr-1" />
              102k
            </div> */}
        </div>
        <div className="text-base leading-normal">
          <h4 className="font-bold text-neutral-600">About</h4>
          <div className="font-normal text-neutral-700">{card.description}</div>
          {card.status_message && (
            <>
              <h4 className="font-bold text-neutral-600 mt-3">Status</h4>
              <div className="font-normal text-neutral-700">{card.status_message}</div>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default ProfileCardExpanded;
