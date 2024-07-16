import clsx from "clsx";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { ExecutionPlan } from "./tasks/types";
import { useRunCanvas } from "./tasks/useRunCanvas";

const ExecutionPlanRenderer = ({ className }: { className?: string }) => {
  const { prepareExecutionPlan } = useRunCanvas();
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);

  useEffect(() => {
    const fetchExecutionPlan = async () => {
      const plan = await prepareExecutionPlan();
      if (plan) setExecutionPlan(plan);
    };

    fetchExecutionPlan();
  }, []);

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
          <h2 className="text-xl font-semibold mb-2">Task {index + 1}</h2>
          <div className="mb-2">
            <strong>Prompt Node:</strong> {taskItem.task.promptNode.data.title} (ID:{" "}
            {taskItem.task.promptNode.id})
          </div>
          <div className="mb-2">
            <strong>Input Nodes:</strong>
            <ul className="list-disc list-inside ml-4">
              {taskItem.task.inputNodes.map((node) => (
                <li key={node.id}>
                  {node.data.title} (ID: {node.id})
                </li>
              ))}
            </ul>
          </div>
          {taskItem.task.outputNode && (
            <div className="mb-2">
              <strong>Output Node:</strong> {taskItem.task.outputNode.data.title} (ID:{" "}
              {taskItem.task.outputNode.id})
            </div>
          )}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Messages for LLM:</h3>
            <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded">
              {taskItem.messages.map((message, i) => (
                <div key={i} className="mb-2">
                  <strong>{message.role}:</strong> {message.content as string}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExecutionPlanRenderer;
