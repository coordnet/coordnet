import "./Editor/styles.css";

import * as blockies from "blockies-ts";
import clsx from "clsx";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";

import { useYDoc } from "@/hooks";
import useUser from "@/hooks/useUser";
import { BackendEntityType } from "@/types";

import { Canvas, Loader } from "./";
import ErrorPage from "./ErrorPage";

type SkillProps = { className?: string };

const Skill = ({ className }: SkillProps) => {
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

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "absolute top-0 z-20 flex h-9 gap-2 leading-9",
          isGuest ? "left-2" : "left-24"
        )}
      >
        <div
          className="flex items-center rounded border border-neutral-200 bg-white px-3 text-sm
            font-medium text-neutral-900"
        >
          {skill && (
            <>
              <img src={skillIcon} className="mr-2 size-4 rounded-full" />
              {skillTitle}
            </>
          )}
        </div>
      </div>
      <Canvas />
    </div>
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
