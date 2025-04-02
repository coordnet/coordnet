import * as Y from "yjs";

import { CanvasEdge, CanvasNode, ExecutionContext, NodeType, SpaceNode } from "../types";
import { createConnectedYDocServer, getSkillNodeCanvas, setNodesState } from "./utils";

export const setExternalData = async (
  outputNodeId: string,
  skillDoc: Y.Doc,
  nodesMap: Y.Map<CanvasNode>,
  context: ExecutionContext,
  targetNode: CanvasNode | undefined
) => {
  if (!(targetNode?.data?.type === NodeType.ExternalData && targetNode?.data?.externalNode)) {
    return;
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`Transferring content from ${outputNodeId} to ExternalData node ${targetNode.id}`);
    const nodeId = targetNode?.data?.externalNode?.nodeId;
    const spaceId = targetNode?.data?.externalNode?.spaceId;
    console.log("Send response to ", targetNode.data.externalNode);

    const [canvasDoc, canvasProvider] = await createConnectedYDocServer(
      `node-graph-${nodeId}`,
      context.authentication
    );
    const [spaceDoc, spaceProvider] = await createConnectedYDocServer(
      `space-${spaceId}`,
      context.authentication
    );

    const targetNodesMap = canvasDoc.getMap<CanvasNode>("nodes");
    const targetEdgesMap = canvasDoc.getMap<CanvasEdge>("edges");
    const targetSpaceMap = spaceDoc.getMap<SpaceNode>("nodes");

    const { nodes: sourceNodes, edges: sourceEdges } = getSkillNodeCanvas(outputNodeId, skillDoc);
    const sourceSpaceMap = skillDoc.getMap<SpaceNode>("nodes");

    console.log(`Transferring ${sourceNodes.length} nodes and ${sourceEdges.length} edges`);
    for (const node of sourceNodes) {
      targetNodesMap.set(node.id, node);
      const sourceNode = sourceSpaceMap.get(node.id);
      if (sourceNode) targetSpaceMap.set(node.id, sourceNode);
      console.log("Added node", node.id);
    }

    for (const edge of sourceEdges) {
      targetEdgesMap.set(edge.id, edge);
    }

    canvasProvider.disconnect();
    spaceProvider.disconnect();

    setNodesState([targetNode.id], nodesMap, "inactive");
  } catch (transferError) {
    console.error(`Failed to save external content to ${targetNode?.id}:`, transferError);
    const errorMsg =
      transferError instanceof Error ? transferError.message : "External access failed";
    if (targetNode?.id)
      setNodesState(
        [targetNode.id],
        nodesMap,
        "error",
        `External access failed: ${errorMsg.substring(0, 100)}`
      );
  }
};
