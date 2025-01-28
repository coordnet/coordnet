import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { ArrowRight, Bot, ChevronRight, Cpu, Play, Settings, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";

import { useRunSkill } from "@/components/Skills/running/useRunSkill";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useCanvas, useUser, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType, YDocScope } from "@/types";

import Buddies from "../Buddies";
import ExecutionPlanRenderer from "../Canvas/ExecutionPlan";
import { Button } from "../ui/button";
import SkillCanvasUpdate from "./SkillCanvasUpdate";
import SkillPermissions from "./SkillPermissions";
import SkillRunHistory from "./SkillRunHistory";
import SkillVersions from "./SkillVersions";
import { formatSkillRunId } from "./utils";

const SkillCanvasControls = () => {
  const { parent, scope } = useYDoc();
  const { inputNodes } = useCanvas();
  const { isGuest } = useUser();
  const { runId, versionId } = useParams();
  const { runStatus, setRunStatus } = useRunSkill();
  const { buddy } = useBuddy();
  const [planOpen, setPlanOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const isSkill = parent.type === BackendEntityType.SKILL;

  if (!isSkill || isGuest) return <></>;

  if (runId) {
    if (runId === "new")
      return (
        <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
          Skill is running
        </div>
      );
    else
      return (
        <>
          <div className="react-flow__panel absolute right-2 top-2 !m-0 !flex items-end gap-2">
            <SkillVersions readOnly />
          </div>
          <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
            Viewing run {formatSkillRunId(runId)} - go back to{" "}
            <Link to={`/skills/${parent.id}`}>edit</Link>?
            <SkillRunHistory />
          </div>
        </>
      );
  }

  return (
    <>
      {scope == YDocScope.READ_ONLY && (
        <div className="react-flow__panel absolute right-2 top-2 !m-0 !flex items-end gap-2">
          <SkillVersions />
        </div>
      )}
      <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
        {scope == YDocScope.READ_WRITE && (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                    border-neutral-200 bg-white px-5 py-4 text-xl font-medium text-neutral-500"
                  variant="secondary"
                  data-tooltip-id="permissions"
                >
                  <Settings2 className="size-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[430px] p-0">
                {parent?.data?.id && (
                  <SkillPermissions id={parent?.data?.id} key={parent?.data.id} />
                )}
              </DialogContent>
            </Dialog>
            <Tooltip id="permissions">Manage permissions</Tooltip>
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
              <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
                <DropdownMenuLabel className="border-b border-b-neutral-100 p-2 text-sm font-medium">
                  Skill Settings
                </DropdownMenuLabel>
                <DropdownMenuItem className="p-0" asChild>
                  <Buddies>
                    <button
                      className="flex w-[180px] cursor-pointer items-center px-2 py-1.5 text-sm
                        font-medium hover:bg-slate-50"
                    >
                      <Bot className="mr-2 size-4 flex-shrink-0 text-neutral-600" />
                      Buddy
                      <div
                        className="ml-1 mr-1 overflow-hidden text-ellipsis whitespace-nowrap
                          text-neutral-400"
                        title={buddy?.name}
                      >
                        {buddy?.name}
                      </div>
                      <ChevronRight className="ml-auto size-4 flex-shrink-0 text-neutral-700" />
                    </button>
                  </Buddies>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center text-sm font-medium"
                  onClick={() => setPlanOpen(true)}
                >
                  <Cpu className="mr-2 size-4 text-neutral-600" />
                  Show Analysis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="flex flex-col items-center gap-2">
          <SkillRunHistory />
          <Link
            to={`/skills/${parent.id}${versionId ? `/versions/${versionId}` : ""}/runs/new`}
            onClick={(e) => {
              if (inputNodes.length === 0) {
                e.preventDefault();
                toast.error("Please add at least one input node to run the skill");
              }
            }}
          >
            <Button
              className={clsx(
                `flex h-16 items-center justify-center gap-2.5 rounded-full border py-4 pl-8 pr-6
                text-xl font-medium`,
                scope == YDocScope.READ_ONLY &&
                  "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
                scope == YDocScope.READ_WRITE && "border-neutral-200 bg-white text-neutral-500"
              )}
              onClick={() => setRunStatus("idle")}
              variant="secondary"
              disabled={runStatus === "running"}
            >
              <div className="flex flex-col">
                <span>Run</span>
              </div>
              <Play className="size-6" />
            </Button>
          </Link>
        </div>

        {scope == YDocScope.READ_WRITE && (
          <div className="flex flex-col items-center gap-2">
            <SkillVersions />
            <Sheet onOpenChange={setPublishOpen} open={publishOpen}>
              <SheetTrigger asChild>
                <Button
                  className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                    border-violet-600 bg-violet-600 py-4 pl-8 pr-6 text-xl font-medium text-white
                    hover:bg-violet-700"
                  variant="default"
                  disabled={Boolean(versionId)}
                >
                  Publish
                  <ArrowRight className="size-6" />
                </Button>
              </SheetTrigger>
              <SkillCanvasUpdate setOpen={setPublishOpen} />
            </Sheet>
          </div>
        )}
      </div>

      <Dialog onOpenChange={(open) => setPlanOpen(open)} open={planOpen}>
        <DialogTrigger></DialogTrigger>
        <DialogContent className="max-w-4/5 max-h-4/5 h-4/5 w-4/5 overflow-hidden">
          <DialogTitle className="hidden">Execution Plan</DialogTitle>
          <ExecutionPlanRenderer />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SkillCanvasControls;
