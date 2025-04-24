import {
  CanvasEdge,
  CanvasNode,
  isResponseNode,
  NodeType,
  proseMirrorJSONToText,
  RunStatus,
  skillYdocToJson,
} from "@coordnet/core";
import { useQuery } from "@tanstack/react-query";
import { generateJSON } from "@tiptap/core";
import clsx from "clsx";
import { ArrowRight, ExternalLink, FileText, HomeIcon, LoaderIcon, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createSkillRun, executeSkillRun, getSkillVersion } from "@/api";
import { Loader } from "@/components";
import { NodesContextProvider, useUser, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { extensions } from "@/lib/readOnlyEditor";
import { title } from "@/lib/utils";
import { BackendEntityType, SkillsRunnerInput, SkillsRunnerInputType, YDocScope } from "@/types";

import SkillRunHistory from "../Skills/SkillRunHistory";
import { formatSkillRunId } from "../Skills/utils";
import { Button } from "../ui/button";
import { Input } from "./Input";
import { Output } from "./Output";
import { Skill } from "./Skill";

const SkillRunner = () => {
  const navigate = useNavigate();
  const { isLoading, user } = useUser();
  const { runId, skillId, versionId } = useParams();
  const {
    parent,
    scope,
    space: { connected, synced, error: yDocError, YDoc: spaceYDoc },
  } = useYDoc();
  const { buddy, setBuddyId } = useBuddy();
  const skill = parent.type === BackendEntityType.SKILL ? parent?.data : undefined;
  const [skillRunLoading, setSkillRunLoading] = useState(false);
  const [skillOutput, setSkillOutput] = useState("");
  const [inputs, setInputs] = useState<SkillsRunnerInput[]>([]);
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<unknown>();
  const runMeta = spaceYDoc?.getMap("meta");
  const isRunning = status === "running" || status === "pending";
  const wasRunningRef = useRef(false);

  // Track when a run completes to auto-open the modal
  useEffect(() => {
    if (isRunning) {
      wasRunningRef.current = true;
    } else if (wasRunningRef.current && !isRunning && status === "success" && skillOutput) {
      setOutputModalOpen(true);
      wasRunningRef.current = false;
    }
  }, [isRunning, status, skillOutput]);

  useEffect(() => {
    console.log(user, isLoading);
    if ((!user && isLoading === false) || (user && user.id == "public")) {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      const loginUrl = `/auth/login?redirect=${currentUrl}`;
      window.location.href = loginUrl;
    }
  }, [user, isLoading]);

  useEffect(() => {
    const checkStatus = () => {
      const newStatus = runMeta.get("status") as RunStatus;
      const newError = runMeta.get("error");
      if (newStatus != status) setStatus(newStatus);
      if (newError != error) setError(newError);
    };
    runMeta.observe(checkStatus);
    return () => runMeta.unobserve(checkStatus);
  }, [runMeta, status, error]);

  const { data: version } = useQuery({
    queryKey: ["skills", parent.id, "versions", versionId],
    queryFn: () => getSkillVersion(versionId ?? ""),
    enabled: Boolean(versionId),
  });

  useEffect(() => {
    if (skill && !versionId && !skill.allowed_actions.includes("write")) {
      setBuddyId(skill.buddy);
    } else if (skill && versionId && version) {
      setBuddyId(version.buddy);
    }
  }, [skill, version, versionId, setBuddyId, scope]);

  useEffect(() => {
    if (skill) title(skill.title ?? "Untitled");
  }, [skill]);

  const newRun = async () => {
    window.location.href = `/skills-runner/${skillId}/${versionId}`;
  };

  const handleAddInput = (newInput: SkillsRunnerInput) => {
    setInputs((prev) => [...prev, newInput]);
  };

  const handleRemoveInput = (id: string) => {
    setInputs((prev) => prev.filter((input) => input.id !== id));
  };

  useEffect(() => {
    if (!runId || !spaceYDoc || !connected || !synced) {
      setInputs([]);
      setSkillOutput("");
      return;
    }
    const skillData = skillYdocToJson(spaceYDoc);
    if (!(`${skillId}-canvas-nodes` in skillData)) {
      toast.error("Unable to parse nodes");
      return;
    }
    // Find all nodes attached to the input node
    const canvasNodes = Object.values(skillData[`${skillId}-canvas-nodes`] as CanvasNode[]);
    const canvasEdges = Object.values(skillData[`${skillId}-canvas-edges`] as CanvasEdge[]);
    const spaceNodes = skillData["nodes"] as { [k: string]: { id: string; title: string } };
    const inputNode = canvasNodes.find((n) => n.data.type === NodeType.Input);
    if (!inputNode) return;
    const inputNodeId = inputNode.id;
    const inputNodeEdges = Object.values(canvasEdges)
      .filter((edge) => edge.target === inputNodeId)
      .map((edge) => edge.source);
    const inputNodes = canvasNodes.filter((node) => inputNodeEdges.includes(node.id));

    // Load all inputs
    const loadedInputs: SkillsRunnerInput[] = [];
    for (const node of inputNodes) {
      const nodeTitle = spaceNodes[node.id]?.title || "";
      const nodeContent = skillData[`${node.id}-document`];
      if (!nodeContent) continue;
      const content = proseMirrorJSONToText(nodeContent);
      let type: SkillsRunnerInputType = "text";
      if (nodeTitle.endsWith(".pdf")) type = "pdf";
      else if (nodeTitle.endsWith(".md")) type = "md";
      else if (nodeTitle.endsWith(".txt")) type = "txt";
      loadedInputs.push({
        id: node.id,
        type,
        name: nodeTitle,
        content,
        error: node.data.error,
      });
    }
    setInputs(loadedInputs);

    // Find and set the output
    const outputNode = canvasNodes.find((n) => n.data.type === NodeType.Output);
    if (!outputNode) return;

    // Find nodes attached to the output node
    const outputNodeId = outputNode.id;
    const outputNodeEdges = Object.values(canvasEdges)
      .filter((edge) => edge.target === outputNodeId || edge.source === outputNodeId)
      .map((edge) => (edge.target === outputNodeId ? edge.source : edge.target));

    // Get the response node
    const finalOutput = canvasNodes.find(
      (node) => outputNodeEdges.includes(node.id) && isResponseNode(node)
    );

    const document = skillData[`${finalOutput?.id}-document`];
    if (document) {
      setSkillOutput(proseMirrorJSONToText(document));
    }
  }, [runId, spaceYDoc, connected, synced, skillId, status]);

  const runSkill = async () => {
    setSkillRunLoading(true);
    setSkillOutput("");
    if (!buddy) {
      return toast.error("You need to set a Buddy to run this skill");
    }
    if (inputs.length === 0) {
      return toast.error("Please provide at least one input to run the skill");
    }
    try {
      // Get current skill data
      const skillData = JSON.parse(JSON.stringify(version?.method_data));
      const spaceNodes = skillData["nodes"] as { [k: string]: { id: string; title: string } };
      const nodesObj = skillData[`${skillId}-canvas-nodes`] as { [k: string]: CanvasNode };
      const canvasNodes = Object.values(nodesObj);
      const edgesObj = skillData[`${skillId}-canvas-edges`] as { [k: string]: CanvasEdge };
      // Find the input node
      const inputNode = canvasNodes.find((n) => n.data.type === NodeType.Input);
      if (!inputNode) {
        toast.error("Input node not found in this skill");
        throw new Error("Input node not found");
      }

      for (const input of inputs) {
        const nodeId = crypto.randomUUID();

        const nodesPerColumn = 3;
        const horizontalSpacing = 300;
        const verticalSpacing = 150;
        const startOffsetY = -((Math.min(inputs.length, nodesPerColumn) - 1) * verticalSpacing) / 2;

        const currentIndex = inputs.indexOf(input);
        const column = Math.floor(currentIndex / nodesPerColumn);
        const row = currentIndex % nodesPerColumn;

        const newNode: CanvasNode = {
          id: nodeId,
          type: "GraphNode",
          data: { type: NodeType.Default },
          style: { width: 200, height: 80 },
          position: {
            x: (inputNode?.position?.x ?? 0) - (column + 1) * horizontalSpacing,
            y: (inputNode?.position?.y ?? 0) + startOffsetY + row * verticalSpacing,
          },
        };

        spaceNodes[nodeId] = {
          id: nodeId,
          title: input.type === "text" ? "User Input" : input.name,
        };

        nodesObj[nodeId] = newNode;
        skillData[`${nodeId}-document`] = generateJSON(input.content, extensions);

        // Create edge with the specified handles
        const edgeId = `edge-${nodeId}-${inputNode.id}`;
        edgesObj[`edge-${edgeId}`] = {
          id: edgeId,
          source: nodeId,
          target: inputNode.id,
          sourceHandle: "target-right", // Connection from the right side of source node
          targetHandle: "target-left", // Connection to the left side of target node
        };
      }

      // Create a new skill run on the backend
      const run = await createSkillRun({
        method: skillId,
        method_data: { ...skillData, meta: { buddy: buddy?.id, status: "pending" } },
        is_dev_run: scope == YDocScope.READ_WRITE,
        method_version: versionId,
      });
      // Execute the skill run
      await executeSkillRun(run.id);
      navigate(`/skills-runner/${skillId}/${versionId}/${run.id}`);
      setSkillRunLoading(false);
    } catch (error) {
      setSkillRunLoading(false);
      console.error("Error running skill:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to run skill: " + errorMessage);
    }
  };

  if (parent.isLoading && !yDocError) {
    return <Loader message="Loading skill..." className="z-60" />;
  }
  if (runId && !connected && !synced) {
    return <Loader message="Loading skill run..." className="z-60" />;
  }

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center bg-gradient-to-b
        from-violet-50 to-blue-50"
      key={runId}
    >
      <div className="absolute top-4 flex w-full items-center justify-between px-4">
        <div className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-2">
          <Button
            asChild
            variant="ghost"
            className="size-9 rounded-lg border border-neutral-200 p-2"
          >
            <Link to="/">
              <HomeIcon className="size-4 text-neutral-500" />
            </Link>
          </Button>
          <div className="flex items-center justify-center gap-2 rounded bg-white px-3 py-1">
            <div className="justify-start text-lg font-semibold leading-7 text-black">
              {skill?.title || "Skill Runner"}
            </div>
          </div>
          <Button variant="ghost" className="size-9 rounded-lg border border-neutral-200 p-2">
            <FileText className="size-4 text-neutral-500" />
          </Button>
        </div>
        <div
          className="flex h-14 items-center justify-center gap-2 rounded-full border
            border-neutral-200 bg-white px-5"
        >
          <div
            className="justify-start font-['Roboto'] text-sm font-medium leading-normal
              text-neutral-900"
          >
            Skill Version {version?.version}
          </div>
        </div>
      </div>
      <div className="flex max-w-[764px] flex-col gap-6 md:flex-row">
        <Input inputs={inputs} onAddInput={handleAddInput} onRemoveInput={handleRemoveInput} />

        <Skill skill={skill} />

        <Output
          inputs={inputs}
          output={skillOutput}
          error={error}
          status={status}
          outputModalOpen={outputModalOpen}
          setOutputModalOpen={setOutputModalOpen}
        />
      </div>

      {isRunning ? (
        <div className="fixed z-50 size-full bg-black/40">
          <div className="absolute bottom-4 w-full">
            {runId && (
              <Link
                to={`/skills/${skillId}/versions/${versionId}/runs/${runId}`}
                target="_blank"
                className="mx-auto mb-2 flex w-fit items-center gap-2.5 rounded-full border
                  border-neutral-200 bg-white px-4 py-1 text-sm font-medium text-neutral-700
                  hover:text-neutral-700"
              >
                See run progress
                <ExternalLink className="size-4" />
              </Link>
            )}
            <Button
              disabled
              className={clsx(
                `mx-auto flex h-16 items-center gap-3 rounded-[100px] bg-green-500 pl-10 pr-6
                  text-xl text-white !opacity-100 hover:bg-neutral-200`
              )}
            >
              Running
              <LoaderIcon className="animate-spin-slow" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4">
          <SkillRunHistory
            className="mx-auto mb-2 w-fit cursor-pointer bg-gradient-to-r from-indigo-100
              to-blue-100"
          />

          {runId ? (
            <Button
              onClick={newRun}
              className={clsx(
                `flex h-16 items-center gap-3 rounded-[100px] bg-white pl-10 pr-6 text-xl
                  text-neutral-700 hover:bg-neutral-200`
              )}
            >
              Exit run {formatSkillRunId(runId)}
              <ArrowRight className="size-6" />
            </Button>
          ) : (
            <Button
              onClick={runSkill}
              disabled={skillRunLoading || isRunning || inputs.length === 0}
              className={clsx(
                `flex h-16 items-center gap-3 rounded-[100px] bg-violet-600 pl-10 pr-6 text-xl
                  text-white hover:bg-violet-700`,
                (skillRunLoading || isRunning || inputs.length === 0) &&
                  "cursor-not-allowed bg-neutral-200 text-neutral-400 hover:bg-neutral-300"
              )}
            >
              {skillRunLoading ? "Loading..." : "Run"}
              <Play className="size-6 text-white" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const SkillRunnerOuter = () => {
  return (
    <NodesContextProvider>
      <SkillRunner />
    </NodesContextProvider>
  );
};

export default SkillRunnerOuter;
