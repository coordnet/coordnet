import { ArrowRight, Play, Settings, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { useRunSkill } from "@/components/Skills/running/useRunSkill";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useCanvas } from "@/hooks";
import { BackendEntityType } from "@/types";

import ExecutionPlanRenderer from "../Canvas/ExecutionPlan";
import { Button } from "../ui/button";
import SkillCanvasUpdate from "./SkillCanvasUpdate";
import SkillPermissions from "./SkillPermissions";
import SkillRunHistory from "./SkillRunHistory";
import SkillVersionHistory from "./SkillVersionHistory";
import { formatSkillRunId } from "./utils";

const SkillCanvasControls = () => {
  const { runId } = useParams();
  const { parent } = useCanvas();
  const { runStatus } = useRunSkill();
  const [planOpen, setPlanOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const isSkill = parent.type === BackendEntityType.SKILL;

  // const { data: versions, isFetched } = useQuery({
  //   queryKey: ["skills", parent.id, "versions"],
  //   queryFn: ({ signal }) => getSkillVersions(signal, parent?.id ?? ""),
  //   enabled: Boolean(parent.id),
  //   initialData: { count: 0, next: "", previous: "", results: [] },
  // });

  // const noVersions = isFetched && versions.count == 0;
  // console.log("noVersions", noVersions, versions.count);

  if (!isSkill) return <></>;

  if (runId) {
    if (runId === "new")
      return (
        <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
          Skill is running
        </div>
      );
    else
      return (
        <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
          Viewing run {formatSkillRunId(runId)} - go back to{" "}
          <Link to={`/skills/${parent.id}`}>edit</Link>?
          <SkillRunHistory />
        </div>
      );
  }

  return (
    <>
      <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
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
            {parent?.data?.id && <SkillPermissions id={parent?.data?.id} key={parent?.data.id} />}
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
          <DropdownMenuContent>
            {/* <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => runCanvas(true)}
              disabled={isRunning}
            >
              Run Selection
            </DropdownMenuItem> */}
            <DropdownMenuItem className="cursor-pointer" onClick={() => setPlanOpen(true)}>
              Show Analysis
            </DropdownMenuItem>
            <Tooltip id="run-canvas">
              Use this to remove highlighted state from nodes if processing was interrupted
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-col items-center gap-2">
          <SkillRunHistory />

          <Link to={`/skills/${parent.id}/runs/new`}>
            <Button
              className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                border-neutral-200 bg-white py-4 pl-8 pr-6 text-xl font-medium text-neutral-500"
              // onClick={() => runCanvas(areNodesSelected)}
              variant="secondary"
              disabled={runStatus === "running"}
            >
              <div className="flex flex-col">
                <span>Run</span>
                {/* {areNodesSelected && <span className="text-xs font-normal">selection</span>} */}
              </div>
              <Play className="size-6" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2">
          <SkillVersionHistory />
          <Sheet onOpenChange={setPublishOpen} open={publishOpen}>
            <SheetTrigger asChild>
              <Button
                className="flex h-16 items-center justify-center gap-2.5 rounded-full border
                  border-violet-600 bg-violet-600 py-4 pl-8 pr-6 text-xl font-medium text-white
                  hover:bg-violet-700"
                variant="default"
              >
                Publish
                <ArrowRight className="size-6" />
              </Button>
            </SheetTrigger>
            <SkillCanvasUpdate setOpen={setPublishOpen} />
          </Sheet>
        </div>
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

export default SkillCanvasControls;
