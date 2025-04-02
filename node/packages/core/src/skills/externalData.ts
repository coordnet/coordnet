import * as Y from "yjs";

import { CanvasEdge, CanvasNode, ExecutionContext, NodeType, SpaceNode } from "../types";
import { getSkillNodePageContent } from "../utils";
import {
  createConnectedYDocServer,
  getSkillNodeCanvas,
  setNodesState,
  setSpaceNodePageMarkdown,
  setSpaceNodeTitle,
} from "./utils";

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

    const { nodes: sourceNodes, edges: sourceEdges } = getSkillNodeCanvas(outputNodeId, skillDoc);
    const sourceSpaceMap = skillDoc.getMap<SpaceNode>("nodes");

    // Map to track which external nodes have been updated
    const updatedExternalNodes = new Set<string | undefined>();

    // First, process all nodes that have sourceNode references
    for (const node of sourceNodes) {
      if (node.data?.sourceNode) {
        const sourceInfo = node.data.sourceNode;

        // If this node has a valid source reference to our target external node space
        if (sourceInfo.spaceId === targetNode.data.externalNode.spaceId) {
          // This node has a connection to the external space
          const nodeId = sourceInfo.nodeId;
          const sourceTitle = sourceSpaceMap.get(node.id)?.title;
          const sourceContent = getSkillNodePageContent(node.id, skillDoc);

          // Update the referenced node in the external space
          if (nodeId && sourceTitle) {
            await setSpaceNodeTitle(
              sourceTitle,
              nodeId,
              targetNode.data.externalNode.spaceId,
              context.authentication
            );
          }

          if (nodeId && sourceContent) {
            await setSpaceNodePageMarkdown(sourceContent, nodeId, context.authentication);
          }

          // Mark this external node as updated
          updatedExternalNodes.add(nodeId);
          console.log(
            `Updated external node ${nodeId} in space ${targetNode.data.externalNode.spaceId}`
          );
        }
      }
    }

    // If there are nodes without source references or if no updates were made yet
    if (updatedExternalNodes.size === 0) {
      // Then transfer all the nodes to the space canvas
      const nodeId = targetNode.data.externalNode.nodeId;
      const spaceId = targetNode.data.externalNode.spaceId;

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

      console.log(
        `Transferring ${sourceNodes.length} nodes and ${sourceEdges.length} edges as default behavior`
      );

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
    }

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
