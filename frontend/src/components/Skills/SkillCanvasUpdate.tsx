import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Globe, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createSkillVersion, handleApiError, updateSkill, updateSkillImage } from "@/api";
import { SheetClose, SheetContent } from "@/components/ui/sheet";
import { useCanvas, useWindowDrag, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType, NodeType, SkillUpdateForm, SkillUpdateFormSchema } from "@/types";

import ImageUpload from "../Profiles/ImageUpload";
import { getProfileCardImage } from "../Profiles/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { removeInputNodesAndEdges, skillYdocToJson } from "./utils";

const SkillCanvasUpdate = ({
  setOpen,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const queryClient = useQueryClient();
  const {
    parent,
    canvas: { YDoc },
  } = useYDoc();
  const { buddyId } = useBuddy();
  const { nodes, inputNodes } = useCanvas();
  const isSkill = parent.type === BackendEntityType.SKILL;

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const isDragging = useWindowDrag();
  const banner = croppedBanner
    ? croppedBanner
    : isSkill
      ? getProfileCardImage(parent.data, true)
      : "";

  const {
    handleSubmit,
    register,
    control,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SkillUpdateForm>({
    resolver: zodResolver(SkillUpdateFormSchema),
    defaultValues: isSkill ? parent.data : {},
  });

  useEffect(() => {
    if (buddyId) setValue("buddy", buddyId);
  }, [buddyId, setValue]);

  const onSubmit = async (data: SkillUpdateForm) => {
    const inputNode = nodes.find((n) => n.data?.type === NodeType.Input);
    const outputNode = nodes.find((n) => n.data?.type === NodeType.Output);

    // TODO: Check the input and output nodes are attached to something
    if (!inputNode)
      return toast.error(
        "An Input node is required, please add to guide where the inputs should be attached to"
      );

    if (!outputNode)
      return toast.error(
        "An Output node is required, please add one to show where the final output response is"
      );

    if (
      inputNodes.length &&
      !window.confirm(
        "You have nodes attached as input to the Input node. These will be removed when " +
          "publishing. If you want to keep the nodes, please attach them directly to the node " +
          "that they should be the input for.\n\nPress OK to publish or Cancel to continue editing."
      )
    ) {
      return;
    }

    try {
      await updateSkill(parent.id, data);
      await updateSkillImage(parent.id, croppedBanner);
      const canvasData = skillYdocToJson(YDoc!);
      const cleanedData = removeInputNodesAndEdges(canvasData);
      await createSkillVersion(parent.id, cleanedData);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setOpen(false);
    } catch (e) {
      handleApiError(e, data, setError);
    }
  };

  if (!isSkill) return <></>;

  return (
    <>
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
              Skill
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
              placeholder="Enter Skill Name"
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
                className="relative mb-0 mt-1 flex aspect-[850/370] w-full flex-shrink-0
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
    </>
  );
};

export default SkillCanvasUpdate;
