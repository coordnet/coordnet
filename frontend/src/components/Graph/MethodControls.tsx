import "reactflow/dist/style.css";
import "./react-flow.css";

import { ArrowRight, Play, Settings, X } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "react-tooltip";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCanvas } from "@/hooks";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import ExecutionPlanRenderer from "./ExecutionPlan";
import { useRunCanvas } from "./tasks/useRunCanvas";

const MethodControls = () => {
  const { nodes } = useCanvas();
  const { runCanvas, resetCanvas, isRunning } = useRunCanvas();
  const [planOpen, setPlanOpen] = useState(false);
  const areNodesSelected = nodes.filter((node) => node.selected).length > 1;

  return (
    <>
      <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                border-neutral-200 bg-white px-5 py-4 text-xl font-medium text-neutral-500"
              variant="secondary"
            >
              <Settings className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => runCanvas(true)}
              disabled={isRunning}
            >
              Run Selection
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setPlanOpen(true)}>
              Show Analysis
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => resetCanvas()}
              data-tooltip-id="run-canvas"
              data-tooltip-place="right"
            >
              Reset Canvas
            </DropdownMenuItem>
            <Tooltip id="run-canvas">
              Use this to remove highlighted state from nodes if processing was interrupted
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="flex h-16 items-center justify-center gap-2.5 rounded-full border
            border-neutral-200 bg-white py-4 pl-8 pr-6 text-xl font-medium text-neutral-500"
          onClick={() => runCanvas(areNodesSelected)}
          variant="secondary"
          disabled={isRunning}
        >
          <div className="flex flex-col">
            <span>Run</span>
            {areNodesSelected && <span className="text-xs font-normal">selection</span>}
          </div>
          <Play className="size-6" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                border-violet-600 bg-violet-600 py-4 pl-8 pr-6 text-xl font-medium text-white
                hover:bg-violet-700"
              variant="default"
            >
              Save
              <ArrowRight className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-6" overlayClassName="!bg-black/40">
            <div
              className="fixed left-1/2 top-1/2 h-52 w-48 -translate-x-1/2 -translate-y-1/2
                rounded-lg bg-white transition-transform"
            >
              PREVIEW
            </div>
            <div className="flex items-center justify-between">
              <div className="bg-profile-modal-gradient px-4 py-2 text-sm font-medium">Method</div>
              <SheetClose asChild>
                <Button className="size-9 p-0" variant="outline">
                  <X className="size-4" />
                </Button>
              </SheetClose>
            </div>
            <Input
              className="-mx-2 -my-1 border-0 text-lg font-medium text-neutral-400
                placeholder:text-neutral-400 focus-visible:ring-gray-6"
              placeholder="Enter Method Name"
            />
            <div className="flex flex-col gap-4 rounded-lg bg-profile-modal-gradient p-4">
              {/* <div>
                <div className="text-xs font-normal leading-none text-neutral-800">Image</div>
              </div> */}
              {/* <div>
                <div className="mb-2 text-xs font-normal leading-none text-neutral-800">
                  Short description
                </div>
                <Input placeholder="Enter short description" />
              </div> */}
              <div>
                <div className="mb-2 text-xs font-normal leading-none text-neutral-800">
                  Allow forking
                </div>
                <Switch />
              </div>
              <div>
                <div className="mb-2 text-xs font-normal leading-none text-neutral-800">Public</div>
                <Switch />
              </div>
            </div>
            <Textarea className="mb-6 h-full" placeholder="Add description" />
            <Button
              className="mt-auto flex h-16 items-center justify-center gap-2.5 self-end rounded-full
                border border-violet-600 bg-violet-600 py-4 pl-8 pr-6 text-xl font-medium text-white
                hover:bg-violet-700"
              variant="default"
            >
              Save
              <ArrowRight className="size-6" />
            </Button>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog onOpenChange={(open) => setPlanOpen(open)} open={planOpen}>
        <DialogTrigger></DialogTrigger>
        <DialogContent className="max-w-4/5 max-h-4/5 h-4/5 w-4/5 overflow-hidden">
          <DialogTitle className="hidden">Test</DialogTitle>
          <ExecutionPlanRenderer />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MethodControls;
