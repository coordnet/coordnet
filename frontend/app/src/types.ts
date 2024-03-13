import { Edge, Node } from "reactflow";

// export type Space = {
//   id: string;
//   name: string;
//   defaultNode: string;
// };
export interface Space {
  id: string;
  url: string;
  // nodes:         any[];
  created_at: Date;
  updated_at: Date;
  title: string;
  // deleted_nodes: any[];
}

export type SpaceNode = {
  id: string;
  title: string;
};

export type GraphNode = Node;
export type GraphEdge = Edge;
