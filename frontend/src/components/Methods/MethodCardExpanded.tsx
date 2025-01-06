import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Play, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { serializeError } from "serialize-error";
import { toast } from "sonner";

import { deleteProfileCard, updateProfileCards } from "@/api";
import ProfileCardManage from "@/components/Profiles/ProfileCardManage";
import { getProfileCardImage, getProfileImage } from "@/components/Profiles/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUser from "@/hooks/useUser";
import { Profile, ProfileCard as ProfileCardType } from "@/types";

const MethodCardExpanded = ({
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
        `block max-h-[90%] w-[500px] max-w-[90%] overflow-auto !rounded-lg border-none bg-white p-0
        outline-none`,
        className
      )}
      showCloseButton={false}
    >
      <div
        className={clsx("flex h-[200px] w-full flex-col items-end rounded-t-lg bg-cover bg-center")}
        style={{ backgroundImage: `url("${banner}")` }}
      >
        {canEdit ? (
          <div className="mr-4 mt-4 flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 bg-red-500 !ring-0 !ring-offset-0 hover:bg-red-600">
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
                        "Are you sure? This action cannot be undone. This will remove the card from all profiles that are using it."
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
                <Button className="h-9 bg-violet-700 !ring-0 !ring-offset-0 hover:bg-violet-800">
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
              className="mr-4 mt-4 h-9 bg-red-500 !ring-0 !ring-offset-0 hover:bg-red-600"
              onClick={() => onRemoveCard(card.id)}
            >
              Remove
            </Button>
          )
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div
            className="inline-flex h-9 items-center rounded bg-blue-50 px-3 text-sm font-medium
              leading-tight text-neutral-600"
          >
            Method
          </div>
          <div className="flex gap-2">
            {card.video_url && (
              <a href={card.video_url} target="_blank" rel="noreferrer">
                <Button
                  className="h-9 border border-neutral-200 bg-white text-black hover:bg-gray-200"
                >
                  <PlayCircle className="mr-1.5 size-4" /> Video
                </Button>
              </a>
            )}
            {Boolean(card.url && canEdit) && (
              <a href={card.url}>
                <Button className="h-9 bg-violet-700 hover:bg-violet-800">
                  <Play className="mr-1.5 size-4" /> Run
                </Button>
              </a>
            )}
          </div>
        </div>
        <h3 className="text-3xl font-semibold leading-9 text-black">{card.title}</h3>
        <div className="flex items-center gap-2 text-base font-normal text-neutral-500">
          {Boolean(card.author_profile) && (
            <Link
              to={`/profiles/${card.author_profile?.profile_slug}`}
              className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap
                text-base font-normal text-neutral-500 hover:text-neutral-600"
            >
              <div
                className="mr-0.5 size-4 flex-shrink-0 rounded-full bg-gray-400 bg-cover bg-center"
                style={{ backgroundImage: `url("${getProfileImage(card.author_profile)}")` }}
              ></div>
              <span className="max-w-full overflow-hidden text-ellipsis">
                @{card.author_profile?.profile_slug}
              </span>
            </Link>
          )}
          {Boolean(card.space_profile) && (
            <>
              {Boolean(card.space_profile && card.author_profile) && <span>&middot;</span>}
              <Link
                to={`/profiles/${card.space_profile?.profile_slug}`}
                className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap
                  text-base font-normal text-neutral-500 hover:text-neutral-600"
              >
                <div
                  className="mr-0.5 size-4 flex-shrink-0 rounded-full bg-gray-400 bg-cover
                    bg-center"
                  style={{ backgroundImage: `url("${getProfileImage(card.space_profile)}")` }}
                ></div>
                <span className="max-w-full overflow-hidden text-ellipsis">
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
              <h4 className="mt-3 font-bold text-neutral-600">Status</h4>
              <div className="font-normal text-neutral-700">{card.status_message}</div>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default MethodCardExpanded;
