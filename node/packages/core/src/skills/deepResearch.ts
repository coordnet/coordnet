import * as Y from "yjs";

import { CanvasNode, Task } from "../types";
import { queryDeepResearch } from "./api";
import { setNodesState, setSkillNodeTitleAndContent } from "./utils";

export const executeDeepResearchTask = async (
  task: Task,
  query: string,
  skillDoc: Y.Doc,
  nodesMap: Y.Map<CanvasNode>,
  outputNode: CanvasNode,
  isLastTask: boolean
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");

    const response = await queryDeepResearch(query);

    // Unlike PaperQA, we don't need to format the response - just use it directly
    const markdown = response;

    // Update both the task output node and final output node if this is the last task
    [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (id) => {
      if (id) await setSkillNodeTitleAndContent(skillDoc, id, "Deep Research Response", markdown);
    });

    // Mark the node as done/inactive
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing Deep Research task", error);
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  }
};
