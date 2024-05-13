import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getNodePermissions, handleApiError } from "@/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNode, useSpace } from "@/hooks";
import useUser from "@/hooks/useUser";
import { PermissionSchema } from "@/types";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import PermissionsList from "./List";

const formSchema = PermissionSchema.pick({ role: true });
type FormType = z.infer<typeof formSchema>;

const NodePermissions = ({
  setOpen,
  className,
}: {
  setOpen?: Dispatch<SetStateAction<boolean>>;
  className?: string;
}) => {
  const [memberOpen, setMemberOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();
  const { node } = useNode();
  const { space } = useSpace();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["nodes", node?.id, "permissions"],
    queryFn: ({ signal }) => getNodePermissions(signal, node?.id),
    enabled: Boolean(node?.id),
    initialData: [],
  });

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormType) => {
    try {
      // await updateSpace(id, values);
      if (setOpen) setOpen(false);
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
    queryClient.invalidateQueries({ queryKey: ["spaces"] });
  };

  if (!node || !space || permissionsLoading || userLoading)
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
          <div className="text-lg font-semibold mb-2">Manage Canvas</div>
          <div className="text-sm text-neutral-500">
            Part of {space?.title}. Contains {node?.subnodes.length} node
            {node?.subnodes.length > 1 ? "s" : ""}.
          </div>
        </div>
      </div>
      {node?.allowed_actions.includes("manage") && (
        <div className="">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Canvas Members</h3>
            {node?.allowed_actions.includes("manage") && (
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
                  {/* <Member space={space} setOpen={setMemberOpen} /> */}
                </DialogContent>
              </Dialog>
            )}
          </div>

          <PermissionsList model="node" space={space} id={node?.id} />
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

export default NodePermissions;
