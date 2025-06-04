import { SkillRun } from "@coordnet/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getPermissions, getSkillRun, updateSkillRun } from "@/api";
import useUser from "@/hooks/useUser";
import { PermissionModel } from "@/types";

import PermissionsList from "../Permissions/List";
import Member from "../Permissions/Member";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { formatSkillRunId } from "./utils";

const SkillRunPermissions = ({ id, className }: { id: string; className?: string }) => {
  const { data: skillRun, isLoading } = useQuery({
    queryKey: ["skills", id, "runs"],
    queryFn: () => getSkillRun(id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const { user, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["skills", id, "runs", "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, PermissionModel.SkillRun, id),
    enabled: Boolean(id),
    initialData: [],
  });

  const { mutate: updateSkillRunMutation } = useMutation({
    mutationFn: (data: Partial<SkillRun>) => updateSkillRun(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", id, "runs"] });
      toast.success("Settings updated successfully");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  if (!id || !skillRun || permissionsLoading || userLoading || isLoading)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  const ownPermissions = permissions?.find((p) => p.user == user?.email);
  const canManage = ownPermissions?.role?.toLowerCase() === "owner";
  const accessValue = skillRun.is_public ? "public" : "invited";

  const handleCopyLink = () => {
    const toastId = toast.loading("Copying skill run URL...");
    try {
      const url = `${window.location.origin}/skills/${skillRun.method}/runs/${skillRun.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Skill run URL copied to clipboard!", { id: toastId });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Error copying to clipboard", { id: toastId });
    }
  };

  return (
    <div className={clsx("flex flex-col gap-8 p-6", className)}>
      <div className="flex">
        <div>
          <div className="mb-2 text-lg font-semibold">Run {formatSkillRunId(skillRun.id)}</div>
          <div className="text-sm text-neutral-500">Skill Run</div>
        </div>
      </div>
      {ownPermissions?.role?.toLowerCase() !== "viewer" && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Who has access?</h3>
          <div className="mb-5 flex items-center justify-between">
            {canManage ? (
              <Select
                value={accessValue}
                onValueChange={(value) => updateSkillRunMutation({ is_public: value === "public" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="z-90">
                  <SelectItem value="invited">Only those invited</SelectItem>
                  <SelectItem value="public">Anyone (Public link)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-neutral-500">
                {accessValue === "public" ? "Anyone (Public link)" : "Only those invited"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
            {ownPermissions?.role?.toLowerCase() == "owner" && (
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex h-auto items-center px-2 py-1 text-sm font-semibold
                      text-violet-600 underline"
                  >
                    Invite <Plus strokeWidth={3} className="ml-2 size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[400px] p-0">
                  <Member skillRun={skillRun} setOpen={setMemberOpen} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <PermissionsList skillRun={skillRun} />
        </div>
      )}

      <div className="flex justify-between">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleCopyLink} className="bg-violet-600 text-white hover:bg-violet-700">
          Copy link
        </Button>
      </div>
    </div>
  );
};

export default SkillRunPermissions;
