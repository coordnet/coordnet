import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  createProfileCard,
  getProfiles,
  getSpaces,
  handleApiError,
  updateProfileCard,
  updateProfileCardImage,
  updateProfileCards,
} from "@/api";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useWindowDrag } from "@/hooks";
import { Profile, ProfileCard, ProfileCardForm, ProfileCardFormSchema } from "@/types";

import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { profileCardLinksMap } from "./constants";
import ImageUpload from "./ImageUpload";
import ProfileField from "./ProfileField";
import { getProfileCardImage } from "./utils";

const ProfileCardManage = ({
  profile,
  card,
  setOpen,
  className,
}: {
  profile: Profile;
  card?: ProfileCard;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles", "users"],
    queryFn: ({ signal }) => getProfiles(signal, "user"),
    refetchInterval: false,
    retry: false,
    throwOnError: true,
    initialData: [],
  });

  const { data: mySpaces, isLoading: mySpacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    refetchInterval: false,
    retry: false,
    throwOnError: true,
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const { data: spaceProfiles, isLoading: spaceProfilesLoading } = useQuery({
    queryKey: ["profiles", "spaces"],
    queryFn: ({ signal }) => getProfiles(signal, "space"),
    refetchInterval: false,
    retry: false,
    throwOnError: true,
    initialData: [],
  });

  const isLoading = profilesLoading || spaceProfilesLoading || mySpacesLoading;

  const mySpaceIds = mySpaces.results.map((space) => space.id);
  const spaces = spaceProfiles.filter((profile) => mySpaceIds.includes(profile?.space ?? ""));

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: { errors },
  } = useForm<ProfileCardForm>({
    resolver: zodResolver(ProfileCardFormSchema),
    defaultValues: card
      ? {
          ...card,
          author_profile: card?.author_profile?.id ?? "",
          space_profile: card?.space_profile?.id ?? "",
        }
      : { draft: true, author_profile: !profile.draft ? profile.id : null, space_profile: null },
  });

  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const isDragging = useWindowDrag();

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const banner = croppedBanner ? croppedBanner : getProfileCardImage(card, true);

  const onSubmit = async (data: ProfileCardForm) => {
    try {
      if (!card?.id) {
        const response = await createProfileCard(data);
        await updateProfileCardImage(response.id, croppedBanner);
        const newCards = [...profile.cards.map((card) => card.id), response.id];
        await updateProfileCards(profile.id, newCards);
      } else {
        const response = await updateProfileCard(card.id, data);
        await updateProfileCardImage(response.id, croppedBanner);
      }
      queryClient.invalidateQueries({ queryKey: ["profile-cards"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
    } catch (e) {
      handleApiError(e, data, setError);
    }
  };

  return (
    <DialogContent
      showCloseButton={false}
      aria-describedby={undefined}
      className={clsx(
        `flex h-fit max-h-[90%] w-[90%] max-w-[580px] flex-col !rounded-2xl
        bg-profile-modal-gradient px-3 py-5`,
        className
      )}
    >
      {isLoading && (
        <div
          className="absolute bottom-0 left-0 right-0 top-0 z-90 flex items-center justify-center
            gap-3 rounded-2xl bg-profile-modal-gradient opacity-40"
        >
          Loading...
          <div className="size-4 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-fit flex-col overflow-hidden">
        <div className="mb-3 flex items-center justify-between px-2">
          <DialogTitle asChild>
            <div className="text-lg font-semibold leading-tight text-neutral-600">Skill</div>
          </DialogTitle>
          <button
            type="submit"
            className="flex h-9 items-center justify-center rounded bg-violet-700 px-3 py-1.5
              text-sm font-medium text-white"
          >
            Save
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-scroll px-2">
          <ImageUpload
            type="banner"
            className="relative mb-0 mt-1 flex aspect-[850/370] w-full flex-shrink-0 items-center
              justify-center rounded-lg"
            image={banner}
            onImageChange={setCroppedBanner}
            editorOptions={{
              width: 800,
              height: 320,
              borderRadius: 0,
            }}
            isDragging={isDragging}
            fileInputRef={bannerFileInputRef}
          />

          <div>
            <div className="mb-1 text-sm font-medium text-neutral-800">Skill Name</div>
            <Input
              {...register("title")}
              className={clsx(errors.title && "border-red-500")}
              aria-invalid={errors.title ? "true" : "false"}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-neutral-800">Description</div>
            <Textarea
              {...register("description")}
              className={clsx(errors.description && "border-red-500")}
              aria-invalid={errors.description ? "true" : "false"}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-neutral-800">Status</div>
            <Textarea
              {...register("status_message")}
              className={clsx(errors.status_message && "border-red-500")}
              aria-invalid={errors.status_message ? "true" : "false"}
            />
            {errors.status_message && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.status_message.message}
              </p>
            )}
          </div>

          <div className="relative">
            <div className="mb-1 text-sm font-medium text-neutral-800">Author</div>
            <Controller
              control={control}
              name="author_profile"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <ProfileField
                  limit={1}
                  data={profiles}
                  initialValue={value ? [value] : []}
                  onSelectionItemsChange={(selectedItems) => {
                    if (selectedItems.length) {
                      onChange(selectedItems[0].id);
                    } else {
                      onChange("");
                    }
                  }}
                  className={clsx("relative", error ? "border-red-500" : "border-gray-300")}
                />
              )}
            />
            {errors.author_profile && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.author_profile.message}
              </p>
            )}
          </div>

          <div className="relative">
            <div className="mb-1 text-sm font-medium text-neutral-800">Space</div>
            <Controller
              control={control}
              name="space_profile"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <ProfileField
                  limit={1}
                  data={spaces}
                  initialValue={value ? [value] : []}
                  onSelectionItemsChange={(selectedItems) => {
                    if (selectedItems.length) {
                      onChange(selectedItems[0].id);
                    } else {
                      onChange("");
                    }
                  }}
                  className={clsx("relative", error ? "border-red-500" : "border-gray-300")}
                />
              )}
            />
            {errors.space_profile && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.space_profile.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-neutral-800">Links</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(profileCardLinksMap).map(
                ([key, { component: Icon, title, note }]) => {
                  const field = key as keyof typeof profileCardLinksMap;
                  const error = errors && errors[field];

                  return (
                    <div key={key}>
                      <div
                        className={clsx(
                          `flex h-10 w-full items-center rounded-md border bg-white px-3 py-2
                          text-sm focus-within:ring-2 focus-within:ring-slate-400
                          focus-within:ring-offset-2`,
                          error && "border-red-500"
                        )}
                      >
                        <Icon className="mr-3 size-4" color="#A3A3A3" />
                        <input
                          placeholder={title}
                          className="h-full w-full py-4 focus:outline-none"
                          {...register(field, { required: false })}
                          aria-invalid={error ? "true" : "false"}
                        />
                      </div>
                      {note && (
                        <p className="-mt-0.5 text-[11px] italic text-neutral-500">{note}</p>
                      )}
                      {error && (
                        <p key={key} className="mt-1 text-xs text-red-600" role="alert">
                          {error.message}
                        </p>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center">
              <Controller
                name="draft"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="public"
                    checked={!field.value}
                    onCheckedChange={(checked) => field.onChange(!checked)}
                  />
                )}
              />
              <label
                htmlFor="public"
                className="ml-2 cursor-pointer text-sm font-medium text-neutral-800"
              >
                Public
              </label>
            </div>
            {errors.draft && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.draft.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </DialogContent>
  );
};

export default ProfileCardManage;
