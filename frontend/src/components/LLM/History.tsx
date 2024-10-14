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
          <div className="flex items-center border-b border-border pb-4 mb-4">
            <Search className="size-4 text-gray-3 mr-2" strokeWidth={3.5} />
            <input className="w-full h-9 focus:outline-none" placeholder="Search History" />
          </div>
          <div className="hover:bg-bg items-center px-1 cursor-pointer mb-2">
            <div className="text-black text-sm">Blah blah blah</div>
            <div className="text-gray-3 text-xs">Buddy name</div>
          </div>
          <div className="hover:bg-bg items-center px-1 cursor-pointer">
            <div className="text-black text-sm">Blah blah blah</div>
            <div className="text-gray-3 text-xs">Buddy name</div>
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
