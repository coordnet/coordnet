import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { getPermissions, getSkill } from "@/api";
import useUser from "@/hooks/useUser";
import { PermissionModel } from "@/types";

import PermissionsList from "../Permissions/List";
import Member from "../Permissions/Member";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "../ui/dialog";

const SkillPermissions = ({ id, className }: { id: string; className?: string }) => {
  const { data: skill, isLoading } = useQuery({
    queryKey: ["skills", id],
    queryFn: ({ signal }: { signal: AbortSignal }) => getSkill(signal, id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const { user, isLoading: userLoading } = useUser();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["skills", id, "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, PermissionModel.Skill, id),
    enabled: Boolean(id),
    initialData: [],
  });

  if (!id || !skill || permissionsLoading || userLoading || isLoading)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  const icon = blockies.create({ seed: skill?.id }).toDataURL();

  const ownPermissions = permissions?.find((p) => p.user == user?.email);

  return (
    <div className={clsx("flex flex-col gap-8 p-6", className)}>
      <div className="flex">
        <div className="mr-4 self-start rounded-sm border border-neutral-200 p-1">
          <img src={icon} className="size-12 rounded-full" />
        </div>
        <div>
          <div className="mb-2 text-lg font-semibold">{skill?.title}</div>
          <div className="text-sm text-neutral-500">Skill</div>
        </div>
      </div>
      {ownPermissions?.role?.toLowerCase() !== "viewer" && (
        <div>
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
                  <Member skill={skill} setOpen={setMemberOpen} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <PermissionsList skill={skill} />
        </div>
      )}

      <DialogClose asChild>
        <Button variant="outline" className="self-start">
          Cancel
        </Button>
      </DialogClose>
    </div>
  );
};

export default SkillPermissions;
