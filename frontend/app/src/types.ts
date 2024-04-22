import { Edge, Node as ReactFlowNode } from "reactflow";

// export type Space = {
//   id: string;
//   name: string;
//   defaultNode: string;
// };
export interface Space {
  id: string;
  url: string;
  nodes: Node[];
  title_slug: string;
  created_at: Date;
  updated_at: Date;
  title: string;
  deleted_nodes: string[];
  default_node: string | null;
}

export interface Node {
  public_id: string;
  title: string;
  text_token_count: number | null;
  title_token_count: number;
  url: string;
}

export type SpaceNode = {
  id: string;
  title: string;
};

export type GraphNode = ReactFlowNode;
export type GraphEdge = Edge;

export interface BackendNode {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
  title: string;
  title_token_count: number;
  // content:           NodeContent | null;
  text: null | string;
  text_token_count: number | null;
  subnodes: string[];
}

export interface Buddy {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  model: "gpt-4-turbo-preview";
  system_message: string;
}

export interface LLMTokenCount {
  [key: string]: number;
}

export interface PaginatedApiResponse<T> {
  count: number;
  next: string;
  previous: string | null;
  results: T[];
}

export interface NodeVersion {
  id: string;
  url: string;
  crdt: string;
  created_at: string;
  updated_at: string;
  document_type: "GRAPH" | "SPACE" | "EDITOR";
  document: string;
}
