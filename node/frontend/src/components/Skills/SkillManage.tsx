import { Skill } from "@coordnet/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createSkill, handleApiError, updateSkill, updateSkillImage } from "@/api";
import { SheetClose } from "@/components/ui/sheet";
import { useUser, useWindowDrag } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { SkillUpdateForm, SkillUpdateFormSchema } from "@/types";

import ImageUpload from "../Profiles/ImageUpload";
import { getProfileCardImage } from "../Profiles/utils";
import { Button } from "../ui/button";
import { DialogContent, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const SkillManage = ({
  skill,
  setOpen,
  className,
}: {
  skill?: Skill;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buddyId } = useBuddy();
  const { profile } = useUser();

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const isDragging = useWindowDrag();
  const banner = croppedBanner ? croppedBanner : getProfileCardImage(skill, true);

  const {
    handleSubmit,
    register,
    control,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SkillUpdateForm>({
    resolver: zodResolver(SkillUpdateFormSchema),
    defaultValues: skill
      ? {
          title: skill.title,
          description: skill.description,
          is_public: skill.is_public,
        }
      : { is_public: false },
  });

  useEffect(() => {
    if (buddyId) setValue("buddy", buddyId);
  }, [buddyId, setValue]);

  const onSubmit = async (data: SkillUpdateForm) => {
    if (!profile) return toast.error("Profile not found");
    try {
      if (!skill) {
        const skill = await createSkill({ ...data, authors: [profile.id] });
        await updateSkillImage(skill.id, croppedBanner);
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        navigate(`/skills/${skill.id}`);
      } else {
        await updateSkill(skill.id, data);
        await updateSkillImage(skill.id, croppedBanner);
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        if (typeof setOpen === "function") setOpen(false);
      }
    } catch (e) {
      handleApiError(e, data, setError);
    }
  };

  return (
    <>
      <DialogContent
        ref={dialogRef}
        showCloseButton={false}
        aria-describedby={undefined}
        className={clsx(
          `flex h-auto max-h-[90%] w-[90%] max-w-[580px] flex-col overflow-auto !rounded-2xl
          bg-profile-modal-gradient`,
          className
        )}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <DialogTitle asChild>
              <div
                className="rounded-md bg-profile-modal-gradient text-lg !font-medium
                  !text-neutral-600"
              >
                {skill ? "Update Skill" : "Build a Skill"}
              </div>
            </DialogTitle>
            <div className="flex items-center gap-3">
              <SheetClose asChild>
                <Button className="h-9 font-medium" variant="outline">
                  {skill ? "Close" : "Back"}
                </Button>
              </SheetClose>
              <Button
                className="h-9 border border-violet-600 bg-violet-600 font-medium text-white
                  hover:bg-violet-700"
                variant="default"
              >
                {skill ? "Update" : "Build"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg bg-profile-modal-gradient">
            <div>
              <div className="mb-2 text-sm font-medium leading-none text-neutral-800">
                Skill Image
              </div>

              <ImageUpload
                type="skill"
                className="relative mb-0 mt-1 flex aspect-[850/370] w-[260px] flex-shrink-0
                  items-center justify-center rounded-lg"
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
            </div>
            <div>
              <div className="mb-2 text-sm font-medium leading-none text-neutral-800">
                Skill Name *
              </div>
              <Input
                {...register("title", { setValueAs: (value) => value || "" })}
                className={clsx(
                  "focus-visible:ring-gray-6",
                  errors.title && "border border-red-500"
                )}
                aria-invalid={errors.title ? "true" : "false"}
                placeholder="Enter Skill Name"
              />
              {errors.title && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium leading-none text-neutral-800">
                Skill Description *
              </div>
              <div>
                <Textarea
                  {...register("description", { setValueAs: (value) => value || "" })}
                  className={clsx(errors.description && "border border-red-500")}
                  placeholder="Enter description"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium leading-none text-neutral-800">Public</div>
              <Controller
                name="is_public"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_public"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
            </div>
          </div>
        </form>
      </DialogContent>
    </>
  );
};

export default SkillManage;
