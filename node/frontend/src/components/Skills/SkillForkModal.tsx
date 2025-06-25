import { SkillJson, skillJsonToYdoc } from "@coordnet/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { GitFork, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  createSkill,
  getSkill,
  getSkillVersion,
  getSkillVersions,
  handleApiError,
  updateSkillImage,
} from "@/api";
import { useUser, useWindowDrag } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import useModal from "@/hooks/useModal";
import { convertImageToBase64, createConnectedYDoc } from "@/lib/utils";
import { SkillCreateForm, SkillCreateFormSchema } from "@/types";

import ImageUpload from "../Profiles/ImageUpload";
import { getProfileCardImage } from "../Profiles/utils";
import { Button } from "../ui/button";
import { DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { forkMethodData } from "./utils";

const SkillForkModal = ({ skillId, className }: { skillId: string; className?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buddyId } = useBuddy();
  const { profile } = useUser();
  const { closeModal } = useModal();

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [croppedBanner, setCroppedBanner] = useState<string | null>(null);
  const [isForking, setIsForking] = useState(false);
  const [forkingStep, setForkingStep] = useState<string>("");
  const isDragging = useWindowDrag();

  const { data: skill, isFetched: skillFeched } = useQuery({
    queryKey: ["skills", skillId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getSkill(signal, skillId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const banner = croppedBanner ? croppedBanner : getProfileCardImage(skill, true);

  const { data: versions, isFetched: versionFetched } = useQuery({
    queryKey: ["skills", skillId, "versions"],
    queryFn: ({ signal }) => getSkillVersions(signal, skillId ?? ""),
    enabled: Boolean(skillId),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const form = useForm<SkillCreateForm>({
    resolver: zodResolver(SkillCreateFormSchema),
    defaultValues: {
      title: skill?.title,
      description: skill?.description,
      is_public: false,
      authors: profile ? [profile.id] : [],
    },
  });
  const {
    register,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (buddyId) setValue("buddy", buddyId);
  }, [buddyId, setValue]);

  useEffect(() => {
    if (versionFetched && versions?.results.length > 0 && !getValues("forked_from")) {
      const latestVersion = versions.results[versions.results.length - 1];
      setValue("forked_from", latestVersion.id);
    }
  }, [versionFetched, versions.results, setValue, getValues]);

  useEffect(() => {
    if (skill?.image && !croppedBanner) {
      convertImageToBase64(skill.image).then((base64) => {
        if (base64) setCroppedBanner(base64);
      });
    }
  }, [skill?.image, croppedBanner]);

  const onSubmit = async (data: SkillCreateForm) => {
    if (!profile) return toast.error("Profile not found");
    if (!data.forked_from) return toast.error("Please select a version to fork");

    setIsForking(true);

    try {
      setForkingStep("Creating method...");
      const forkedSkill = await createSkill({ ...data, authors: [profile.id] });

      if (croppedBanner) {
        setForkingStep("Updating image...");
        await updateSkillImage(forkedSkill.id, croppedBanner);
      }

      setForkingStep("Getting version data...");
      const version = await getSkillVersion(data.forked_from);
      const modifiedMethodData = forkMethodData(version.method_data, skillId, forkedSkill.id);

      setForkingStep("Loading version into fork...");
      const [doc, provider] = await createConnectedYDoc(`method-${forkedSkill.id}`);
      await skillJsonToYdoc(modifiedMethodData as SkillJson, doc);
      provider.disconnect();

      queryClient.invalidateQueries({ queryKey: ["skills"] });
      closeModal();
      navigate(`/skills/${forkedSkill.id}`);

      toast.success("Skill forked successfully!");
    } catch (e) {
      console.error("Fork error:", e);
      handleApiError(e, data, setError);
    } finally {
      setIsForking(false);
      setForkingStep("");
    }
  };

  if (!skillFeched || !versionFetched)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  return (
    <>
      <DialogContent
        ref={dialogRef}
        showCloseButton={false}
        aria-describedby={undefined}
        className={clsx(
          `flex h-auto max-h-[90%] w-[90%] max-w-[580px] flex-col overflow-auto !rounded-2xl
          bg-white`,
          className
        )}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <DialogTitle asChild>
                <div className="text-lg font-medium text-neutral-600">Fork a Skill</div>
              </DialogTitle>
              <div className="flex items-center gap-3">
                <DialogClose asChild>
                  <Button disabled={isForking} className="h-9 font-medium" variant="outline">
                    Back
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isForking}
                  className="h-9 border border-violet-600 bg-violet-600 font-medium text-white
                    hover:bg-violet-700 disabled:opacity-50"
                  variant="default"
                >
                  {isForking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {forkingStep || "Forking..."}
                    </div>
                  ) : (
                    "Fork"
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-neutral-500">
              A <strong>fork</strong> is a copy of a Skill. You can build your own versions of the
              Skill, while crediting and keeping the link to the original Skill.
            </div>

            <div className="flex items-center gap-2">
              <GitFork className="size-4 flex-shrink-0 text-neutral-500" />
              <div
                className="text-sm font-medium text-neutral-800 [&>a]:text-neutral-800
                  [&>a]:underline"
              >
                <Link to={`/skills/${skill?.id}`}>{skill?.title}</Link> by{" "}
                <Link to={`/profiles/${skill?.creator?.profile_slug}`}>
                  @{skill?.creator?.profile_slug}
                </Link>
              </div>
            </div>

            <div>
              <FormField
                control={form.control}
                name="forked_from"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormControl>
                        <Select
                          disabled={isForking}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="z-90">
                            {versions?.results.map((version) => (
                              <SelectItem key={version.id} value={version.id}>
                                Forking Version {version.version}
                                {version.version === skill?.latest_version?.version &&
                                  " (latest version)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-neutral-200 pt-4 text-sm font-medium text-neutral-500">
              By default name, image and description are the same as the original Skill. You can
              customise these below.
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-2 text-sm font-medium leading-none text-neutral-800">
                  Skill Image
                </div>

                <ImageUpload
                  type="skill"
                  className="relative mb-0 mt-1 flex aspect-[850/370] w-[280px] flex-shrink-0
                    items-center justify-center rounded-lg border border-gray-200"
                  image={banner}
                  onImageChange={setCroppedBanner}
                  editorOptions={{
                    width: 800,
                    height: 320,
                    borderRadius: 8,
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
                  disabled={isForking}
                  className={clsx(
                    "border-gray-200 focus-visible:border-blue-500 focus-visible:ring-blue-500",
                    errors.title &&
                      "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500"
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
                    disabled={isForking}
                    className={clsx(
                      `min-h-[80px] border-gray-200 focus-visible:border-blue-500
                      focus-visible:ring-blue-500`,
                      errors.description &&
                        "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500"
                    )}
                    placeholder="Enter description"
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium leading-none text-neutral-800">Public</div>
                <Controller
                  name="is_public"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="is_public"
                      disabled={isForking}
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                  )}
                />
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </>
  );
};

export default SkillForkModal;
