import { NodeType, skillYdocToJson } from "@coordnet/core";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Cpu,
  Edit,
  Loader as LoaderIcon,
  Play,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createSkillVersion } from "@/api";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useUser, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { useRunSkill } from "@/hooks/useRunSkill";
import { BackendEntityType, YDocScope } from "@/types";

import Buddies from "../Buddies";
import ExecutionPlanRenderer from "../Canvas/ExecutionPlan";
import Loader from "../Loader";
import { Button } from "../ui/button";
import SkillRunHistory from "./SkillRunHistory";
import SkillVersions from "./SkillVersions";
import { removeInputNodesAndEdges } from "./utils";

const SkillCanvasControls = () => {
  const {
    parent,
    scope,
    canvas: { YDoc },
  } = useYDoc();
  const queryClient = useQueryClient();
  const { isGuest } = useUser();
  const { nodes, inputNodes } = useCanvas();
  const { runId, versionId } = useParams();
  const { runSkill, status, error } = useRunSkill();
  const { buddy } = useBuddy();
  const [planOpen, setPlanOpen] = useState(false);
  const isSkill = parent.type === BackendEntityType.SKILL;
  const [loading, setLoading] = useState(false);

  const publishSkillVersion = async () => {
    const inputNode = nodes.find((n) => n.data?.type === NodeType.Input);
    const outputNode = nodes.find((n) => n.data?.type === NodeType.Output);

    // TODO: Check the input and output nodes are attached to something
    if (!inputNode)
      return toast.error(
        "An Input node is required, please add to guide where the inputs should be attached to"
      );

    if (!outputNode)
      return toast.error(
        "An Output node is required, please add one to show where the final output response is"
      );

    if (
      inputNodes.length &&
      !window.confirm(
        "You have nodes attached as input to the Input node. These will be removed when " +
          "publishing. If you want to keep the nodes, please attach them directly to the node " +
          "that they should be the input for.\n\nPress OK to publish or Cancel to continue editing."
      )
    ) {
      return;
    } else if (!window.confirm("Are you sure you want to publish this version?")) {
      return;
    }

    try {
      const canvasData = skillYdocToJson(YDoc!);
      const cleanedData = removeInputNodesAndEdges(canvasData);
      await createSkillVersion(parent.id, cleanedData);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill version published");
    } catch {
      toast.error("Failed to publish skill version");
    }
  };

  if (!isSkill || isGuest) return <></>;

  if (loading) {
    return <Loader message="Creating run..." className="z-60 bg-white/30" />;
  }

  if (runId) {
    if (status === "idle" || status === "pending" || status === "running")
      return (
        <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
          <Link to={`/skills/${parent.id}${versionId ? `/versions/${versionId}` : ""}`}>
            <Button
              className={clsx(
                `group h-16 w-[180px] rounded-full border border-neutral-200 bg-white py-4 pl-8 pr-6
                text-xl font-medium text-violet-600 hover:bg-red-400 hover:text-white`
              )}
              variant="secondary"
            >
              <div className="flex items-center justify-center gap-2.5 group-hover:hidden">
                Running
                <LoaderIcon className="size-8 animate-spin-slow" />
              </div>
              <div className="hidden items-center justify-center gap-2.5 group-hover:flex">
                Stop
                <div className="ml-1 size-6 rounded-md border-2 border-white" />
              </div>
            </Button>
          </Link>
        </div>
      );
    else
      return (
        <>
          <div className="react-flow__panel absolute right-2 top-2 !m-0 !flex items-end gap-2">
            <SkillVersions readOnly />
          </div>
          <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
            {status === "error" && (
              <div
                className="ml-2 !flex max-w-96 items-end gap-2 rounded border border-red-400
                  bg-red-50 px-2 py-1"
              >
                {String(error)}
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <SkillRunHistory />
              <Link to={`/skills/${parent.id}${versionId ? `/versions/${versionId}` : ""}`}>
                <Button
                  className={clsx(
                    `flex h-16 items-center justify-center gap-2.5 rounded-full border
                    border-neutral-200 bg-white py-4 pl-8 pr-6 text-xl font-medium text-neutral-500`
                  )}
                  variant="secondary"
                >
                  Edit Skill
                  <Edit className="size-6" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      );
  }

  return (
    <>
      {scope !== YDocScope.READ_WRITE && (
        <div className="react-flow__panel absolute right-2 top-2 !m-0 !flex items-end gap-2">
          <SkillVersions />
        </div>
      )}
      {scope == YDocScope.READ_WRITE && (
        <div
          className="react-flow__panel absolute right-3 top-3 !m-0 !flex flex-col items-end gap-2"
        >
          <Button
            className="flex h-9 items-center justify-center gap-1.5 font-medium text-neutral-600"
            variant="outline"
            disabled={Boolean(versionId)}
            onClick={publishSkillVersion}
          >
            Publish Version
            <ArrowRight className="size-4" />
          </Button>
          <SkillVersions />
        </div>
      )}
      <div className="react-flow__panel absolute bottom-14 right-2 !m-0 !flex items-end gap-2">
        {scope == YDocScope.READ_WRITE && (
          <>
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
          <Button
            className={clsx(
              `flex h-16 items-center justify-center gap-2.5 rounded-full border py-4 pl-8 pr-6
              text-xl font-medium`,
              scope !== YDocScope.READ_WRITE &&
                "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
              scope == YDocScope.READ_WRITE && "border-neutral-200 bg-white text-neutral-500"
            )}
            onClick={async () => {
              setLoading(true);
              await runSkill();
              setLoading(false);
            }}
            variant="secondary"
            disabled={status === "running"}
          >
            Run <Play className="size-6" />
          </Button>
        </div>
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
