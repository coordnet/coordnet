import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Settings2 } from "lucide-react";
import { useState } from "react";

import { getPermissions } from "@/api";
import useUser from "@/hooks/useUser";
import { PermissionModel, Skill, Space } from "@/types";

import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import Member from "./Member";

const List = ({
  space,
  skill,
  readOnly = false,
  className,
}: {
  space?: Space;
  skill?: Skill;
  readOnly?: boolean;
  className?: string;
}) => {
  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const { user, isLoading: userLoading } = useUser();

  const model = space ? PermissionModel.Space : PermissionModel.Skill;
  const data = space ? space : skill;

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: [model + "s", data?.id, "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, model, data?.id),
    enabled: Boolean(data?.id),
  });

  if (permissionsLoading || userLoading)
    return (
      <div className="flex items-center justify-center p-6 pb-0">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  const ownPermissions = permissions?.find((p) => p.user == user?.email);
  const canEdit = !readOnly && ownPermissions?.role?.toLowerCase() == "owner";

  return (
    <ul className={clsx("mt-1 max-h-40 overflow-auto", className)} key={`${model}-${data?.id}`}>
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        {!permissionsLoading && permissions?.length === 0 && (
          <div className="mt-6 flex items-center justify-center italic text-neutral-400">
            No permissions set
          </div>
        )}
        {permissions?.map((permission) => {
          const icon = blockies.create({ seed: permission?.user }).toDataURL();
          return (
            <li
              key={`permissions-members-${permission?.id}`}
              className={clsx("flex items-center gap-2 rounded p-2 text-sm font-medium", {
                "group cursor-pointer hover:bg-neutral-100": canEdit,
              })}
            >
              <img src={icon} className="size-4 rounded-full" /> {permission?.user}
              {permission?.user == user?.email && (
                <div className="text-xs font-normal text-neutral-500">You</div>
              )}
              <div className="ml-auto text-sm capitalize text-neutral-400 group-hover:hidden">
                {permission?.role}
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  className="ml-auto hidden h-auto p-0 pl-3 text-sm text-neutral-700
                    group-hover:block"
                  onClick={() => {
                    setSelectedPermission(permission.id);
                    setMemberOpen(true);
                  }}
                >
                  <Settings2 className="size-4" />
                </Button>
              )}
            </li>
          );
        })}
        <DialogContent className="w-[400px] p-0">
          {selectedPermission && (
            <Member
              space={space}
              skill={skill}
              permissionId={selectedPermission}
              setOpen={setMemberOpen}
            />
          )}
        </DialogContent>
      </Dialog>
    </ul>
  );
};

export default List;
