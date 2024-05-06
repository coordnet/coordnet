import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createPermission,
  deletePermission,
  getMe,
  getSpacePermissions,
  handleApiError,
} from "@/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionModel, PermissionSchema, Space } from "@/types";

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
  permissionId,
  setOpen,
  className,
}: {
  space: Space;
  permissionId?: string;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["spaces", space.id, "permissions"],
    queryFn: ({ signal }) => getSpacePermissions(signal, space.id),
    enabled: Boolean(space?.id),
  });

  const permission = permissions?.find((p) => p.id == permissionId);
  const icon = blockies.create({ seed: permission?.user }).toDataURL();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { role: "Member", user: "" },
  });

  useEffect(() => {
    if (permission) {
      form.setValue("user", permission.user, { shouldTouch: true });
      form.setValue("role", permission.role, { shouldTouch: true });
    }
  }, [permission, form]);

  const onSubmit = async (values: FormType) => {
    try {
      if (permission) {
        await deletePermission(PermissionModel.Space, space.id, permission.id);
        await createPermission(PermissionModel.Space, space.id, values);
      } else {
        await createPermission(PermissionModel.Space, space.id, values);
      }
      if (setOpen) setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["spaces", space.id] });
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
  };

  const onPermissionsDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (permission?.id) {
      await deletePermission(PermissionModel.Space, space.id, permission.id);
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      if (setOpen) setOpen(false);
    }
  };

  if (permissionsLoading || userLoading)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="size-4 text-neutral-500 animate-spin ml-3" />
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
            <div className="p-1 border border-neutral-200 rounded-sm mr-4 self-start">
              <img src={icon} className="size-12 rounded-full" />
            </div>
          )}
          <div>
            <div className="text-lg font-semibold mb-2">
              {permission ? "Manage Member" : "Invite to Space"}
            </div>
            <div className="text-sm text-neutral-500">{space.title}</div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="user"
            render={({ field }) => (
              <FormItem className="flex items-center">
                <FormLabel className="text-sm font-semibold w-20">Email</FormLabel>
                <div className="flex-grow">
                  <FormControl>
                    <Input placeholder="Email address" disabled={Boolean(permission)} {...field} />
                  </FormControl>
                  <FormMessage className="mt-1 ml-1" />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="flex items-center">
                <FormLabel className="text-sm font-semibold w-20">Role</FormLabel>
                <div className="flex-grow">
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-90">
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="mt-1 ml-1" />
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
                      "If you remove yourself from the space you will no longer " +
                        "have access to it. Are you sure you want to continue?",
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
