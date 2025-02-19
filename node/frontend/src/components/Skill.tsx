import "./Editor/styles.css";

import { ReactFlowProvider } from "@xyflow/react";
import clsx from "clsx";
import { useParams } from "react-router-dom";

import { useYDoc } from "@/hooks";

import { Canvas, Loader } from "./";
import ErrorPage from "./ErrorPage";

type SkillProps = { className?: string };

const Skill = ({ className }: SkillProps) => {
  const { runId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();

  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || parent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  return (
    <div className={clsx("relative", className)}>
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
