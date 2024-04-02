import clsx from "clsx";
import { Command as CommandPrimitive } from "cmdk";
import { Bot, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useBuddy from "@/hooks/useBuddy";

import BuddyForm from "./BuddyForm";

const Buddies = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [buddyFormOpen, setBuddyFormOpen] = useState(false);

  const { buddies, isLoading, setBuddyId } = useBuddy();
  const [editBuddyId, setEditBuddyId] = useState<string>();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "=" && (e.metaKey || e.ctrlKey) && open) {
        e.preventDefault();
        if (open) {
          setBuddyFormOpen(true);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    if (!buddyFormOpen) {
      setEditBuddyId(undefined);
    }
  }, [buddyFormOpen]);

  return (
    <div className={clsx("", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className="size-9 p-0 shadow-md" variant="outline" data-tooltip-id="llm-buddy">
            <Bot className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0">
          <Command>
            {isLoading && (
              <CommandPrimitive.Loading className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-white/60 z-50">
                Loading…
              </CommandPrimitive.Loading>
            )}
            <CommandInput placeholder="Type a command or search..." className="px-0" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup
                heading={
                  <div className="flex">
                    <Bot className="mr-1 size-4" />
                    <span>Buddies</span>
                  </div>
                }
              >
                {buddies.map((buddy) => (
                  <CommandItem
                    key={`buddies-${buddy.id}`}
                    onSelect={() => {
                      setBuddyId(buddy.id);
                      setOpen(false);
                    }}
                    className="text-gray-2"
                  >
                    <span className="font-medium">{buddy.name}</span>
                    <span className="text-xs ml-1">
                      {buddy.model == "gpt-4-turbo-preview" ? "GPT-4" : "Unknown"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-4 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditBuddyId(buddy.id);
                        setBuddyFormOpen(true);
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <Popover open={buddyFormOpen} onOpenChange={setBuddyFormOpen}>
                  <PopoverTrigger asChild>
                    <CommandItem
                      onSelect={() => setBuddyFormOpen(true)}
                      className="text-purple aria-[selected='true']:text-purple"
                    >
                      <Plus className="mr-1 size-4" /> Create Buddy
                      <CommandShortcut>⌘+</CommandShortcut>
                    </CommandItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-4">
                    <BuddyForm setOpen={setBuddyFormOpen} buddyId={editBuddyId} />
                  </PopoverContent>
                </Popover>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Tooltip id="llm-buddy" openEvents={{ mouseenter: true }}>
        Buddies
      </Tooltip>
    </div>
  );
};

export default Buddies;
