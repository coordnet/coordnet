import { ExecutionPlan } from "@coordnet/core";
import clsx from "clsx";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { useNodesContext } from "@/hooks";
import { useRunSkill } from "@/hooks/useRunSkill";

const ExecutionPlanRenderer = ({ className }: { className?: string }) => {
  const { prepareExecutionPlan } = useRunSkill();
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const { nodesMap } = useNodesContext();

  useEffect(() => {
    const fetchExecutionPlan = async () => {
      const plan = await prepareExecutionPlan();
      if (plan) setExecutionPlan(plan as ExecutionPlan);
    };

    fetchExecutionPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = (nodeId: string) => {
    const node = nodesMap?.get(nodeId);
    return node?.title || "";
  };

  if (!executionPlan) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Loading... <Loader2Icon className="ml-3 size-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className={clsx("h-full overflow-auto", className)}>
      <h1 className="mb-4 text-2xl font-bold">Execution Plan</h1>
      {executionPlan.tasks.map((taskItem, index) => (
        <div key={index} className="mb-6 rounded-lg border p-4 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">
            Task {index + 1} ({taskItem.type.toLowerCase()})
          </h2>
          <div className="mb-2">
            <strong>Prompt Node:</strong> {getTitle(taskItem.task.promptNode.id)} (ID:{" "}
            {taskItem.task.promptNode.id})
          </div>
          <div className="mb-2">
            <strong>Input Nodes:</strong>
            <ul className="ml-4 list-inside list-disc">
              {taskItem.task.inputNodes.map((node) => (
                <li key={node.id}>
                  {getTitle(node.id)} (ID: {node.id})
                </li>
              ))}
            </ul>
          </div>
          {taskItem.task.outputNode && (
            <div className="mb-2">
              <strong>Output Node:</strong> {getTitle(taskItem.task.outputNode.id)} (ID:{" "}
              {taskItem.task.outputNode.id})
            </div>
          )}
          <div className="mt-4">
            {taskItem.type == "PROMPT" && (
              <>
                <h3 className="mb-2 text-lg font-semibold">Messages for LLM:</h3>
                <div className="max-h-40 overflow-y-auto rounded bg-gray-100 p-2">
                  {taskItem?.messages?.map((message, i) => (
                    <div key={i} className="mb-2">
                      <strong>{message.role}:</strong> {message.content as string}
                    </div>
                  ))}
                </div>
              </>
            )}
            {taskItem.type == "PAPERS" && (
              <>
                <h3 className="mb-2 text-lg font-semibold">Query for papers:</h3>
                <div className="max-h-40 overflow-y-auto rounded bg-gray-100 p-2">
                  {taskItem.query ?? ""}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExecutionPlanRenderer;
