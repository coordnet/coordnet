import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bot } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createBuddy, deleteBuddy, updateBuddy } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PopoverClose } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useBuddy from "@/hooks/useBuddy";

const formSchema = z.object({
  name: z.string().min(2).max(255),
  model: z.enum(["gpt-4-turbo-preview"]),
  system_message: z.string().min(2).max(10000),
  description: z.string().min(1),
});

const CreateBuddy = ({
  setOpen,
  buddyId,
  className,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buddyId?: string;
  className?: string;
}) => {
  const queryClient = useQueryClient();
  const { buddies } = useBuddy();

  const buddy = buddies.find((buddy) => buddy.id === buddyId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: buddy ? buddy.name : "",
      model: buddy ? buddy.model : "gpt-4-turbo-preview",
      description: buddy ? buddy.description : "",
      system_message: buddy ? buddy.system_message : "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values);
    if (buddy) {
      await updateBuddy(buddy.id, values);
    } else {
      await createBuddy(values);
    }
    queryClient.invalidateQueries({ queryKey: ["buddies"] });
    setOpen(false);
  };

  const onBuddyDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (buddy?.id) await deleteBuddy(buddy?.id);
    queryClient.invalidateQueries({ queryKey: ["buddies"] });
    setOpen(false);
  };

  return (
    <div className={clsx("", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="relative">
                <div className="flex items-center">
                  <FormLabel className="w-[110px]">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Buddy name" {...field} />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="relative">
                <div className="flex items-center">
                  <FormLabel className="w-[110px]">Description</FormLabel>
                  <FormControl>
                    <Input placeholder="What the buddy is for" {...field} />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel className="w-[110px]">LLM</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4-turbo-preview">GPT-4</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="system_message"
            render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel>System Message</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-between items-center pt-4">
            <PopoverClose asChild>
              <Button variant="outline" className="text-sm font-bold">
                Cancel
              </Button>
            </PopoverClose>
            {Boolean(buddy) && (
              <Button
                variant="destructive"
                size="sm"
                className="text-sm font-bold ml-auto mr-4"
                onClick={onBuddyDelete}
              >
                Delete
              </Button>
            )}
            <Button
              type="submit"
              className="text-sm font-bold bg-purple text-white hover:bg-purple/90"
            >
              <Bot className="size-4 mr-1" /> {buddy ? "Update" : "Create"} Buddy
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateBuddy;
