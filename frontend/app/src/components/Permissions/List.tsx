import { useQuery } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Settings2 } from "lucide-react";
import { useState } from "react";

import { getMe, getNodePermissions, getSpacePermissions } from "@/api";
import { Space } from "@/types";

import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import Member from "./Member";

const List = ({
  model,
  id,
  space,
  readOnly = false,
  className,
}: {
  model: "node" | "space";
  id: string;
  space: Space;
  readOnly?: boolean;
  className?: string;
}) => {
  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

  // const id = space.id;

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["spaces", id, "permissions"],
    queryFn: ({ signal }) => {
      return model == "space"
        ? getSpacePermissions(signal, id ?? "")
        : model == "node"
          ? getNodePermissions(signal, id ?? "")
          : [];
    },
    enabled: Boolean(id),
  });

  if (permissionsLoading || userLoading)
    return (
      <div className="flex items-center justify-center p-6 pb-0">
        Loading <Loader2 className="size-4 text-neutral-500 animate-spin ml-3" />
      </div>
    );

  const ownPermissions = permissions?.find((p) => p.user == user?.email);
  const canEdit = !readOnly && ownPermissions?.role == "Owner";

  return (
    <ul className={clsx("mt-1 max-h-40 overflow-auto", className)} key={`${model}-${id}`}>
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        {permissions?.length === 0 && (
          <div className="flex items-center justify-center mt-6 italic text-neutral-400">
            No permissions set
          </div>
        )}
        {permissions?.map((permission) => {
          const icon = blockies.create({ seed: permission?.user }).toDataURL();
          return (
            <li
              key={`permissions-members-${permission?.id}`}
              className={clsx("flex gap-2 items-center text-sm font-medium rounded p-2", {
                "cursor-pointer group hover:bg-neutral-100": canEdit,
              })}
            >
              <img src={icon} className="size-4 rounded-full" /> {permission?.user}
              {permission?.user == user?.email && (
                <div className="text-neutral-500 text-xs font-normal">You</div>
              )}
              <div className="ml-auto text-sm text-neutral-400 group-hover:hidden">
                {permission?.role}
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  className="ml-auto text-sm text-neutral-700 group-hover:block hidden p-0 pl-3 h-auto"
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
        <DialogContent className="p-0 w-[400px]">
          {selectedPermission && (
            <Member space={space} permissionId={selectedPermission} setOpen={setMemberOpen} />
          )}
        </DialogContent>
      </Dialog>
    </ul>
  );
};

export default List;
