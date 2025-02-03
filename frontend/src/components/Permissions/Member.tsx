import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createPermission, deletePermission, getPermissions, handleApiError } from "@/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useUser from "@/hooks/useUser";
import { PermissionModel, PermissionSchema, Skill, Space } from "@/types";

import { Button } from "../ui/button";
import { DialogClose } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

const formSchema = PermissionSchema.pick({ user: true, role: true }).extend({
  user: z.string().min(1, { message: "Required" }).email(),
});
type FormType = z.infer<typeof formSchema>;

const Member = ({
  space,
  skill,
  permissionId,
  setOpen,
  className,
}: {
  space?: Space;
  skill?: Skill;
  permissionId?: string;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  const model = space ? PermissionModel.Space : PermissionModel.Skill;
  const data = space ? space : skill;

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: [model + "s", data?.id, "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, model, data?.id),
    enabled: Boolean(data?.id),
  });

  const permission = permissions?.find((p) => p.id == permissionId);
  const icon = blockies.create({ seed: permission?.user }).toDataURL();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: permission
      ? { role: permission.role, user: permission.user }
      : { role: "member", user: "" },
  });

  useEffect(() => {
    if (permission) {
      form.reset({ user: permission.user, role: permission.role });
    }
  }, [permission, form]);

  const onSubmit = async (values: FormType) => {
    try {
      if (permission) {
        await deletePermission(model, data?.id ?? "", permission.id);
        await createPermission(model, data?.id ?? "", values);
      } else {
        await createPermission(model, data?.id ?? "", values);
      }
      if (setOpen) setOpen(false);
      queryClient.invalidateQueries({ queryKey: [model + "s", data?.id] });
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
  };

  const onPermissionsDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (permission?.id) {
      await deletePermission(model, data?.id ?? "", permission.id);
      queryClient.invalidateQueries({ queryKey: [model + "s"] });
      if (setOpen) setOpen(false);
    }
  };

  if (permissionsLoading || userLoading)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={clsx("flex flex-col gap-8 p-6", className)}
        key={permissionId}
      >
        <div className="flex">
          {permission && (
            <div className="mr-4 self-start rounded-sm border border-neutral-200 p-1">
              <img src={icon} className="size-12 rounded-full" />
            </div>
          )}
          <div>
            <div className="mb-2 text-lg font-semibold">
              {permission ? "Manage Member" : "Invite to " + model}
            </div>
            <div className="text-sm text-neutral-500">{data?.title}</div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="user"
            render={({ field }) => (
              <FormItem className="flex items-center">
                <FormLabel className="w-20 text-sm font-semibold">Email</FormLabel>
                <div className="flex-grow">
                  <FormControl>
                    <Input placeholder="Email address" disabled={Boolean(permission)} {...field} />
                  </FormControl>
                  <FormMessage className="ml-1 mt-1" />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="flex items-center">
                <FormLabel className="w-20 text-sm font-semibold">Role</FormLabel>
                <div className="flex-grow">
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-90">
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="ml-1 mt-1" />
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <div className="flex items-center gap-2">
            {permission && (
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  // Warn before delete if user is
                  if (
                    permission?.user == user?.email &&
                    confirm(
                      `If you remove yourself from the ${model} you will no longer ` +
                        "have access to it. Are you sure you want to continue?"
                    )
                  ) {
                    onPermissionsDelete(e);
                  } else {
                    onPermissionsDelete(e);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button className="bg-violet-600 hover:bg-violet-500">
              {permission ? "Save changes" : "Send invite"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default Member;
