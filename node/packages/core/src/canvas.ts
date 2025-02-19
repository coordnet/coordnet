import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";

import { setSkillNodePageMarkdown } from "./skills";
import { CanvasEdge, CanvasNode, NodeType, SpaceNode } from "./types";

export const addInputNode = async (skillId: string, doc: Y.Doc, content: string) => {
  const nodesMap: Y.Map<CanvasNode> = doc.getMap(`${skillId}-canvas-nodes`);
  const edgesMap: Y.Map<CanvasEdge> = doc.getMap(`${skillId}-canvas-edges`);
  const nodes = Array.from(nodesMap.values());
  const spaceMap: Y.Map<SpaceNode> = doc.getMap("nodes");
  const inputNode = nodes.find((n) => n.data?.type === NodeType.Input);

  if (!inputNode) {
    throw Error("Could not find an Input node");
  }

  const target = inputNode.id;
  const source = uuidv4();

  if (nodesMap && spaceMap) {
    const newNode: CanvasNode = {
      id: source,
      type: "GraphNode",
      position: { x: inputNode.position.x, y: inputNode.position.y - 140 },
      style: { width: 200, height: 80 },
      data: {},
    };
    spaceMap.set(source, { id: source, title: "Input Node" });
    nodesMap.set(source, newNode);
    setSkillNodePageMarkdown(content, source, doc);

    const id = `edge-${source}target-bottom-${target}target-top`;
    edgesMap?.set(id, {
      id,
      source,
      target,
      sourceHandle: "target-bottom",
      targetHandle: "target-top",
    });
  } else {
    throw Error("Nodes or space map is not available");
  }
  return source;
};
