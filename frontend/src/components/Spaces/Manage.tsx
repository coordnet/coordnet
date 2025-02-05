import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getPermissions, getSpace, handleApiError, updateSpace } from "@/api";
import useUser from "@/hooks/useUser";
import { PermissionModel, SpaceSchema } from "@/types";

import PermissionsList from "../Permissions/List";
import Member from "../Permissions/Member";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

const formSchema = SpaceSchema.pick({ title: true });
type FormType = z.infer<typeof formSchema>;

const Manage = ({
  id,
  setOpen,
  className,
}: {
  id: string;
  setOpen: Dispatch<SetStateAction<boolean>>;
  className?: string;
}) => {
  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  const {
    data: space,
    isLoading: spaceLoading,
    isFetching,
  } = useQuery({
    queryKey: ["spaces", id],
    queryFn: ({ signal }) => getSpace(signal, id ?? ""),
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["spaces", id, "permissions"],
    queryFn: ({ signal }) => getPermissions(signal, PermissionModel.Space, id),
    enabled: Boolean(id),
    initialData: [],
  });

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (space) {
      form.setValue("title", space.title, { shouldTouch: true });
    }
  }, [space, form]);

  const onSubmit = async (values: FormType) => {
    try {
      await updateSpace(id, values);
      if (setOpen) setOpen(false);
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
    queryClient.invalidateQueries({ queryKey: ["spaces"] });
  };

  if (!id || !space || spaceLoading || isFetching || permissionsLoading || userLoading)
    return (
      <div className="flex items-center justify-center p-8">
        Loading <Loader2 className="ml-3 size-4 animate-spin text-neutral-500" />
      </div>
    );

  const icon = blockies.create({ seed: space?.id }).toDataURL();

  const ownPermissions = permissions?.find((p) => p.user == user?.email);

  return (
    <div className={clsx("flex flex-col gap-8 p-6", className)}>
      <div className="flex">
        <div className="mr-4 self-start rounded-sm border border-neutral-200 p-1">
          <img src={icon} className="size-12 rounded-full" />
        </div>
        <div>
          <div className="mb-2 text-lg font-semibold">{space?.title}</div>
          <div className="text-sm text-neutral-500">
            A Space for all your canvases and nodes.
            {/* <br />
            Contains {(space?.nodes?.length ?? 0).toLocaleString()} node
            {space?.nodes?.length ?? 0 > 1 ? "s" : ""}. */}
          </div>
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
                  <Member space={space} setOpen={setMemberOpen} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <PermissionsList space={space} />
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={clsx("flex flex-col gap-8 border-t border-neutral-100 pt-6", className)}
        >
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormLabel className="w-20 text-sm font-semibold">Name</FormLabel>
                  <div className="flex-grow">
                    <FormControl>
                      <Input placeholder="Space name" {...field} />
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
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={
                ownPermissions?.role?.toLowerCase() == "viewer" || form.formState.isSubmitting
              }
            >
              {form.formState.isSubmitting ? (
                <>
                  Saving <Loader2 className="ml-2 size-3 animate-spin" />
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Manage;
