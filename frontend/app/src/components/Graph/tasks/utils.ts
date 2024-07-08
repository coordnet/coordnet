import * as Y from "yjs";

import { GraphNode, NodeType } from "@/types";

export const setNodesActive = (
  nodeIds: string[],
  nodesMap: Y.Map<GraphNode> | undefined,
  active: boolean = true,
) => {
  nodeIds.forEach((id) => {
    const node = nodesMap?.get(id);
    if (node) nodesMap?.set(id, { ...node, data: { ...node.data, active } });
  });
};

export const isResponseNode = (node: GraphNode) => {
  return (
    node?.data?.type === NodeType.ResponseMultiple || node?.data?.type === NodeType.ResponseSingle
  );
};
