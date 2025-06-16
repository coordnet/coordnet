import * as Y from "yjs";

import { CanvasEdge, CanvasNode, ExecutionContext, NodeType, SpaceNode, Task } from "../types";
import { getSkillNodePageContent } from "../utils";
import {
  createConnectedYDocServer,
  documentHasContent,
  getSkillNodeCanvas,
  isResponseNode,
  setNodesState,
  setSpaceNodePageJson,
  setSpaceNodeTitle,
  waitForNode,
} from "./utils";

export const addExternalDataNodes = async (
  task: Task,
  tasks: Task[],
  inputNode: CanvasNode,
  context: ExecutionContext,
  spaceMap: Y.Map<SpaceNode>
) => {
  const otherNodes = task.inputNodes.filter(
    (node) => !isResponseNode(node) && node.data.type !== NodeType.ExternalData
  );

  const spaceId = inputNode.data?.externalNode?.spaceId ?? "";
  const [canvasDoc, canvasProvider] = await createConnectedYDocServer(
    `node-graph-${inputNode.data?.externalNode?.nodeId}`,
    context.authentication
  );
  const nodes = Array.from(canvasDoc.getMap<CanvasNode>("nodes").values());

  const [spaceDoc, spaceProvider] = await createConnectedYDocServer(
    `space-${inputNode.data?.externalNode?.spaceId}`,
    context.authentication
  );
  const externalSpaceMap = spaceDoc.getMap<SpaceNode>("nodes");

  for (const node of nodes) {
    const spaceNode = externalSpaceMap.get(node.id);
    if (!spaceNode) continue;
    spaceMap.set(node.id, spaceNode);

    // Create source node info with reference to original external node
    const sourceNodeInfo = {
      id: inputNode.id,
      spaceId: inputNode.data?.externalNode?.spaceId,
      nodeId: node.id,
    };

    const newSubNode = {
      ...node,
      data: {
        ...node.data,
        externalNode: { spaceId, nodeId: node.id, depth: 1 },
        sourceNode: sourceNodeInfo,
      },
    };

    tasks.push({
      ...task,
      inputNodes: [...otherNodes, newSubNode],
      sourceNodeInfo: sourceNodeInfo,
    });
  }

  // Close connections
  spaceProvider.disconnect();
  canvasProvider.disconnect();
};

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

    // Get the output node to check its type
    const outputNode = nodesMap.get(outputNodeId);
    if (!outputNode) {
      console.warn("Output node not found:", outputNodeId);
      return;
    }

    // Handle different response node types
    switch (outputNode.data?.type) {
      case NodeType.ResponseTable:
      case NodeType.ResponseCombined: {
        // Get the response node's title and page content and add to external data node
        const sourceSpaceMap = skillDoc.getMap<SpaceNode>("nodes");
        const responseTitle = sourceSpaceMap.get(outputNodeId)?.title || "";
        const responseContent = getSkillNodePageContent(outputNodeId, skillDoc, "json");

        // Update the external data node's title and page content
        if (responseTitle) {
          await setSpaceNodeTitle(
            responseTitle,
            targetNode.data.externalNode.nodeId,
            targetNode.data.externalNode.spaceId,
            context.authentication
          );
        }

        if (responseContent && documentHasContent(responseContent)) {
          try {
            await waitForNode(targetNode.data.externalNode.nodeId, context.authentication);
            await setSpaceNodePageJson(
              responseContent,
              targetNode.data.externalNode.nodeId,
              context.authentication
            );
          } catch (error) {
            console.error(`Failed to wait for node ${targetNode.data.externalNode.nodeId}:`, error);
          }
        }

        console.log(`Updated external data node with title: "${responseTitle}" and page content`);
        break;
      }

      case NodeType.ResponseSingle:
      case NodeType.ResponseMultiple:
      case NodeType.ResponseMarkMap:
      default: {
        // Transfer all canvas nodes and edges
        const { nodes: sourceNodes, edges: sourceEdges } = getSkillNodeCanvas(
          outputNodeId,
          skillDoc
        );
        const sourceSpaceMap = skillDoc.getMap<SpaceNode>("nodes");

        // Track which nodes have been processed via source references
        const processedNodeIds = new Set<string>();

        // First, process all nodes that have sourceNode references (targeted updates)
        for (const node of sourceNodes) {
          if (node.data?.sourceNode) {
            const sourceInfo = node.data.sourceNode;

            // If this node has a valid source reference to our target external node space
            if (sourceInfo.spaceId === targetNode.data.externalNode.spaceId) {
              // This node has a connection to the external space
              const nodeId = sourceInfo.nodeId;
              const sourceTitle = sourceSpaceMap.get(node.id)?.title;
              const sourceContent = getSkillNodePageContent(node.id, skillDoc, "json");

              // Update the referenced node in the external space
              if (nodeId && sourceTitle) {
                await setSpaceNodeTitle(
                  sourceTitle,
                  nodeId,
                  targetNode.data.externalNode.spaceId,
                  context.authentication
                );
              }

              if (nodeId && sourceContent && documentHasContent(sourceContent)) {
                try {
                  await waitForNode(nodeId, context.authentication);
                  await setSpaceNodePageJson(sourceContent, nodeId, context.authentication);
                } catch (error) {
                  console.error(`Failed to wait for node ${nodeId}:`, error);
                }
              }

              // Mark this node as processed
              processedNodeIds.add(node.id);
              console.log(
                `Updated external node ${nodeId} in space ${targetNode.data.externalNode.spaceId}`
              );
            }
          }
        }

        // Second, identify nodes that don't have source references
        const unprocessedNodes = sourceNodes.filter((node) => !processedNodeIds.has(node.id));

        // If there are unprocessed nodes OR no nodes were processed at all, do bulk transfer
        if (unprocessedNodes.length > 0 || processedNodeIds.size === 0) {
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

          // Determine which nodes to transfer
          const nodesToTransfer = unprocessedNodes.length > 0 ? unprocessedNodes : sourceNodes;

          console.log(
            `Transferring ${nodesToTransfer.length} nodes and ${sourceEdges.length} edges for ${outputNode.data?.type || "default"} behavior (${unprocessedNodes.length > 0 ? "unprocessed nodes" : "all nodes"})`
          );

          for (const node of nodesToTransfer) {
            targetNodesMap.set(node.id, node);
            const sourceNode = sourceSpaceMap.get(node.id);
            if (sourceNode) targetSpaceMap.set(node.id, sourceNode);

            // Also transfer the page content for each node
            const pageContent = getSkillNodePageContent(node.id, skillDoc, "json");
            if (pageContent && documentHasContent(pageContent)) {
              try {
                await waitForNode(node.id, context.authentication);
                await setSpaceNodePageJson(pageContent, node.id, context.authentication);
              } catch (error) {
                console.error(`Failed to wait for node ${node.id}:`, error);
              }
            }
          }

          for (const edge of sourceEdges) {
            targetEdgesMap.set(edge.id, edge);
          }

          canvasProvider.disconnect();
          spaceProvider.disconnect();
        }
        break;
      }
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
