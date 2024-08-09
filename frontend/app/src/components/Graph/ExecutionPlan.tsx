import clsx from "clsx";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { useSpace } from "@/hooks";

import { ExecutionPlan } from "./tasks/types";
import { useRunCanvas } from "./tasks/useRunCanvas";

const ExecutionPlanRenderer = ({ className }: { className?: string }) => {
  const { prepareExecutionPlan } = useRunCanvas();
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const { nodesMap } = useSpace();

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
      <div className="w-full h-full flex items-center justify-center">
        Loading... <Loader2Icon className="animate-spin size-4 ml-3" />
      </div>
    );
  }

  return (
    <div className={clsx("h-full overflow-auto ", className)}>
      <h1 className="text-2xl font-bold mb-4">Execution Plan</h1>
      {executionPlan.tasks.map((taskItem, index) => (
        <div key={index} className="mb-6 p-4 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">
            Task {index + 1} ({taskItem.type.toLowerCase()})
          </h2>
          <div className="mb-2">
            <strong>Prompt Node:</strong> {getTitle(taskItem.task.promptNode.id)} (ID:{" "}
            {taskItem.task.promptNode.id})
          </div>
          <div className="mb-2">
            <strong>Input Nodes:</strong>
            <ul className="list-disc list-inside ml-4">
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
                <h3 className="text-lg font-semibold mb-2">Messages for LLM:</h3>
                <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded">
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
                <h3 className="text-lg font-semibold mb-2">Query for papers:</h3>
                <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded">
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
