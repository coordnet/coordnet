import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import React, { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { getProfiles, handleApiError, updateProfile, updateProfileImages } from "@/api";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useWindowDrag } from "@/hooks";
import { Profile, ProfileForm, ProfileFormSchema } from "@/types";
import { socialMediaValidators } from "@/utils/socialMediaValidation";

import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { profilesIconMap } from "./constants";
import ImageUpload from "./ImageUpload";
import ProfileField from "./ProfileField";
import ValidationIndicator from "./ValidationIndicator";
import { getProfileBannerImage, getProfileImage } from "./utils";

const EditProfile = ({
  profile,
  setOpen,
  className,
}: {
  profile: Profile;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles", "users", profile.space],
    queryFn: ({ signal }) => getProfiles(signal, "user", profile.space),
    refetchInterval: false,
    retry: false,
    throwOnError: true,
    initialData: [],
  });

  const {
    control,
    handleSubmit,
    register,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      title: profile.title,
      profile_slug: profile.profile_slug,
      description: profile.description,
      draft: profile.draft,
      website: profile.website,
      telegram_url: profile.telegram_url,
      bluesky_url: profile.bluesky_url,
      twitter_url: profile.twitter_url,
      eth_address: profile.eth_address,
      members: profile.members.map((member) => member.id),
    },
  });

  const isSpace = Boolean(profile?.space);
  const isUser = Boolean(profile?.user);

  const [croppedAvatar, setCroppedAvatar] = useState<string | null>(null);
  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const isDragging = useWindowDrag();

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const avatar = croppedAvatar ? croppedAvatar : getProfileImage(profile, true);
  const banner = croppedBanner ? croppedBanner : getProfileBannerImage(profile, true);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const response = await updateProfile(profile.id, data);
      console.log(response);
      await updateProfileImages(profile.id, croppedAvatar, croppedBanner);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
      if (profile.profile_slug !== data.profile_slug) {
        navigate(`/profiles/${data.profile_slug}`);
      }
    } catch (e) {
      handleApiError(e, data, setError);
    }
  };

  const dialogRef = useRef<HTMLDivElement>(null);

  return (
    <DialogContent
      ref={dialogRef}
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
            <div className="text-lg font-semibold leading-tight text-neutral-600">Edit Profile</div>
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
          <div className="relative mb-1 mt-1 w-full">
            <ImageUpload
              type="banner"
              className="mb-0 flex aspect-[125/37] w-full items-center justify-center rounded-lg"
              image={banner}
              onImageChange={setCroppedBanner}
              editorOptions={{
                width: 1200 * 2,
                height: 320 * 2,
                borderRadius: 0,
              }}
              isDragging={isDragging}
              fileInputRef={bannerFileInputRef}
            />

            <ImageUpload
              type="avatar"
              className="absolute -bottom-6 ml-6 size-[120px] rounded-full"
              image={avatar}
              onImageChange={setCroppedAvatar}
              editorOptions={{
                width: 200 * 2,
                height: 200 * 2,
                borderRadius: 400,
              }}
              isDragging={isDragging}
              fileInputRef={avatarFileInputRef}
            />
          </div>

          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-neutral-800">Name</div>
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
            <div className="mb-1 text-sm font-medium text-neutral-800">Username</div>
            <Input
              {...register("profile_slug")}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toLowerCase();
              }}
              className={clsx(errors.profile_slug && "border-red-500")}
              aria-invalid={errors.profile_slug ? "true" : "false"}
            />
            {errors.profile_slug && (
              <p className="mt-1 text-xs text-red-600 first-letter:capitalize" role="alert">
                {errors.profile_slug.message?.includes("profile slug already")
                  ? "This username has already been taken"
                  : errors.profile_slug.message}
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

          {isSpace && (
            <div className="relative">
              <div className="mb-1 text-sm font-medium text-neutral-800">Members to display</div>
              <Controller
                control={control}
                name="members"
                render={({ field: { onChange, value }, fieldState: { error } }) => {
                  return (
                    <>
                      <ProfileField
                        data={profiles}
                        initialValue={value}
                        onSelectionItemsChange={(selectedItems) => {
                          onChange(selectedItems.map((item) => item.id));
                        }}
                        className={clsx("relative", error ? "border-red-500" : "border-gray-300")}
                      />
                      {error && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {/* @ts-expect-error it is an array sometimes */}
                          {error.length ? error[0].message : error.message}
                        </p>
                      )}
                    </>
                  );
                }}
              />
            </div>
          )}

          <div>
            <div className="mb-1 text-sm font-medium text-neutral-800">Links</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(profilesIconMap).map(([key, { component: Icon, title }]) => {
                const field = key as keyof typeof profilesIconMap;
                const error = errors && errors[field];
                const validator = socialMediaValidators[field];

                return (
                  <div key={key}>
                    <div
                      className={clsx(
                        `flex h-10 w-full items-center rounded-md border bg-white px-3 py-2 text-sm
                        focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2`,
                        error && "border-red-500"
                      )}
                    >
                      <Icon className="mr-3 size-4" color="#A3A3A3" />
                      <input
                        placeholder={validator ? `${title} (${validator.example})` : title}
                        className="h-full w-full py-4 focus:outline-none"
                        {...register(field, { 
                          required: false,
                          validate: (value) => {
                            if (!value || value === "") return true; // Empty is valid
                            if (validator) {
                              return validator.pattern.test(value) || validator.message;
                            }
                            return true;
                          }
                        })}
                        aria-invalid={error ? "true" : "false"}
                      />
                      {validator && (
                        <ValidationIndicator 
                          value={watch(field) || ""} 
                          platform={field}
                          className="ml-2"
                        />
                      )}
                    </div>
                    {error && (
                      <p key={key} className="mt-1 text-xs text-red-600" role="alert">
                        {error.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isUser && (
            <div>
              <div className="mb-1 text-sm font-medium text-neutral-800">ETH Address</div>
              <Input
                {...register("eth_address")}
                className={clsx(errors.eth_address && "border-red-500")}
                aria-invalid={errors.eth_address ? "true" : "false"}
              />
              {errors.eth_address && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.eth_address.message}
                </p>
              )}
            </div>
          )}
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

export default EditProfile;
