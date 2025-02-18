import clsx from "clsx";
import { History as HistoryIcon, Search } from "lucide-react";
import { Tooltip } from "react-tooltip";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Button } from "../ui/button";

const History = ({ className }: { className?: string }) => {
  return (
    <div className={clsx("", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className={clsx("size-9 p-0 shadow-md")}
            variant="outline"
            data-tooltip-id="llm-history"
          >
            <HistoryIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <div className="mb-4 flex items-center border-b border-border pb-4">
            <Search className="mr-2 size-4 text-gray-3" strokeWidth={3.5} />
            <input className="h-9 w-full focus:outline-none" placeholder="Search History" />
          </div>
          <div className="mb-2 cursor-pointer items-center px-1 hover:bg-bg">
            <div className="text-sm text-black">Blah blah blah</div>
            <div className="text-xs text-gray-3">Buddy name</div>
          </div>
          <div className="cursor-pointer items-center px-1 hover:bg-bg">
            <div className="text-sm text-black">Blah blah blah</div>
            <div className="text-xs text-gray-3">Buddy name</div>
          </div>
        </PopoverContent>
      </Popover>
      <Tooltip id="llm-history" openEvents={{ mouseenter: true }}>
        History
      </Tooltip>
    </div>
  );
};

export default History;
