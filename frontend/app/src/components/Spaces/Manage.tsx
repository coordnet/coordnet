import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getMe, getSpace, getSpacePermissions, handleApiError, updateSpace } from "@/api";
import { SpaceSchema } from "@/types";

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
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

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
    queryFn: ({ signal }) => getSpacePermissions(signal, id ?? ""),
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
        Loading <Loader2 className="size-4 text-neutral-500 animate-spin ml-3" />
      </div>
    );

  const icon = blockies.create({ seed: space?.id }).toDataURL();

  const ownPermissions = permissions?.find((p) => p.user == user?.email);

  return (
    <div className={clsx("flex flex-col gap-8 p-6", className)}>
      <div className="flex">
        <div className="p-1 border border-neutral-200 rounded-sm mr-4 self-start">
          <img src={icon} className="size-12 rounded-full" />
        </div>
        <div>
          <div className="text-lg font-semibold mb-2">{space?.title}</div>
          <div className="text-sm text-neutral-500">
            A Space for all your canvases and nodes.
            {/* <br />
            Contains {(space?.nodes?.length ?? 0).toLocaleString()} node
            {space?.nodes?.length ?? 0 > 1 ? "s" : ""}. */}
          </div>
        </div>
      </div>
      {ownPermissions?.role !== "Viewer" && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
            {ownPermissions?.role == "Owner" && (
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-sm font-semibold flex items-center text-violet-600 underline px-2 py-1 h-auto"
                  >
                    Invite <Plus strokeWidth={3} className="ml-2 size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 w-[400px]">
                  <Member space={space} setOpen={setMemberOpen} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <PermissionsList model="space" space={space} id={id} />
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
                  <FormLabel className="text-sm font-semibold w-20">Name</FormLabel>
                  <div className="flex-grow">
                    <FormControl>
                      <Input placeholder="Space name" {...field} />
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
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={ownPermissions?.role == "Viewer" || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  Saving <Loader2 className="animate-spin size-3 ml-2" />
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
