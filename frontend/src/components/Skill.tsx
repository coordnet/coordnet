import "./Editor/styles.css";

import { useQueryClient } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import { Settings2, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { deleteSkill } from "@/api";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYDoc } from "@/hooks";
import useUser from "@/hooks/useUser";
import { BackendEntityType } from "@/types";

import { Canvas, Loader } from "./";
import ErrorPage from "./ErrorPage";
import SkillPermissions from "./Skills/SkillPermissions";
import { Button } from "./ui/button";

type SkillProps = { className?: string };

const Skill = ({ className }: SkillProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();
  const { isGuest } = useUser();

  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || parent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  const skill = parent.type === BackendEntityType.SKILL ? parent.data : undefined;
  const skillIcon = blockies.create({ seed: skill?.id }).toDataURL();
  const skillTitle = skill?.title ?? "Untitled";

  const onDelete = async () => {
    if (
      window.confirm("Are you sure you want to delete this skill? This cannot be undone") &&
      parent?.data
    ) {
      await deleteSkill(parent?.data.id);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      navigate("/");
    }
  };

  return (
    <Dialog>
      <div className={clsx("relative", className)}>
        <div
          className={clsx(
            "absolute top-0 z-20 flex h-9 gap-2 leading-9",
            isGuest ? "left-2" : "left-24"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex h-9 items-center rounded px-3">
                {skill && (
                  <>
                    <img src={skillIcon} className="mr-2 size-4 rounded-full" />
                    {skillTitle}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DialogTrigger>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center font-medium text-neutral-700"
                >
                  <Settings2 className="mr-2 size-4" /> Manage Permissions
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem
                className="flex cursor-pointer items-center font-medium text-red-500"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Canvas />
      </div>
      <DialogContent className="w-[430px] p-0">
        {parent?.data?.id && <SkillPermissions id={parent?.data?.id} key={parent?.data.id} />}
      </DialogContent>
    </Dialog>
  );
};

const SkillOuter = ({ ...props }: SkillProps) => {
  return (
    <ReactFlowProvider>
      <Skill {...props} />
    </ReactFlowProvider>
  );
};

export default SkillOuter;
