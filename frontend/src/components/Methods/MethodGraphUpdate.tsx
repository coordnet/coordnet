import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Globe, X } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createMethodVersion, handleApiError, updateMethod, updateMethodImage } from "@/api";
import { SheetClose, SheetContent } from "@/components/ui/sheet";
import { useCanvas, useNodesContext, useWindowDrag } from "@/hooks";
import { BackendEntityType, MethodUpdateForm, MethodUpdateFormSchema } from "@/types";

import ImageUpload from "../Profiles/ImageUpload";
import { getProfileCardImage } from "../Profiles/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { methodYdocToJson } from "./utils";

const MethodGraphUpdate = ({
  setOpen,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const queryClient = useQueryClient();
  const { parent } = useCanvas();
  const { yDoc } = useNodesContext();
  const isMethod = parent.type === BackendEntityType.METHOD;

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const isDragging = useWindowDrag();
  const banner = croppedBanner
    ? croppedBanner
    : isMethod
      ? getProfileCardImage(parent.data, true)
      : "";

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: { errors },
  } = useForm<MethodUpdateForm>({
    resolver: zodResolver(MethodUpdateFormSchema),
    defaultValues: isMethod ? parent.data : {},
  });

  const onSubmit = async (data: MethodUpdateForm) => {
    console.log(data);
    try {
      await updateMethod(parent.id, data);
      await updateMethodImage(parent.id, croppedBanner);
      const canvasData = methodYdocToJson(yDoc!);
      await createMethodVersion(parent.id, canvasData);
      queryClient.invalidateQueries({ queryKey: ["methods"] });
      setOpen(false);
    } catch (e) {
      handleApiError(e, data, setError);
    }
  };

  if (!isMethod) return <></>;

  return (
    <SheetContent overlayClassName="!bg-black/40">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col gap-6">
        {/* <div
        className="fixed left-1/2 top-1/2 h-52 w-48 -translate-x-1/2 -translate-y-1/2 rounded-lg
          bg-white transition-transform"
      >
        PREVIEW
      </div> */}
        <div className="flex items-center justify-between">
          <div className="rounded-md bg-profile-modal-gradient px-4 py-2 text-sm font-medium">
            Method
          </div>
          <SheetClose asChild>
            <Button className="size-9 p-0" variant="outline">
              <X className="size-4" />
            </Button>
          </SheetClose>
        </div>

        <div>
          <Input
            {...register("title", { setValueAs: (value) => value || "" })}
            className={clsx(
              `-mx-2 -my-1 border-0 text-lg font-medium placeholder:text-neutral-400
              focus-visible:ring-gray-6`,
              errors.title && "border border-red-500"
            )}
            aria-invalid={errors.title ? "true" : "false"}
            placeholder="Enter Method Name"
          />
          {errors.title && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4 rounded-lg bg-profile-modal-gradient p-4">
          <div>
            <div className="text-xs font-normal leading-none text-neutral-800">Image</div>

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
          </div>
          <div>
            <div className="mb-2 text-xs font-normal leading-none text-neutral-800">
              Short description
            </div>
            <div>
              <Input
                {...register("description", { setValueAs: (value) => value || "" })}
                placeholder="Enter short description"
                className={clsx(errors.description && "border-red-500")}
                aria-invalid={errors.description ? "true" : "false"}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-normal leading-none text-neutral-800">Public</div>
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
        <Textarea
          {...register("text", { setValueAs: (value) => value || "" })}
          className="h-full"
          placeholder="Add description"
        />
        <Button
          className="mt-auto flex h-16 items-center justify-center gap-2.5 self-end rounded-full
            border border-violet-600 bg-violet-600 py-4 pl-8 pr-6 text-xl font-medium text-white
            hover:bg-violet-700"
          variant="default"
        >
          Publish
          <Globe className="size-6" />
        </Button>
      </form>
    </SheetContent>
  );
};

export default MethodGraphUpdate;
