// Modified from https://github.com/TypeFox/npm-dependency-graph/blob/master/typings/elkjs/index.d.ts
declare module "https://cdn.jsdelivr.net/npm/elkjs@0.9.3/+esm" {
  export interface LayoutOptions {
    [key: string]: string;
  }

  export interface ElkPoint {
    x: number;
    y: number;
  }

  export interface ElkGraphElement {
    id: string;
    labels?: ElkLabel[];
    layoutOptions?: LayoutOptions;
  }

  export interface ElkShape extends ElkGraphElement {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  export interface ElkNode extends ElkShape {
    children?: ElkNode[];
    ports?: ElkPort[];
    edges?: ElkEdge[];
  }

  export type ElkPort = ElkShape;

  export interface ElkLabel extends ElkShape {
    text: string;
  }

  export interface ElkEdge extends ElkGraphElement {
    junctionPoints?: ElkPoint[];
  }

  export interface ElkPrimitiveEdge extends ElkEdge {
    source: string;
    sourcePort?: string;
    target: string;
    targetPort?: string;
    sourcePoint?: ElkPoint;
    targetPoint?: ElkPoint;
    bendPoints?: ElkPoint[];
  }

  export interface ElkExtendedEdge extends ElkEdge {
    sources: string[];
    targets: string[];
    sections: ElkEdgeSection[];
  }

  export interface ElkEdgeSection extends ElkGraphElement {
    startPoint: ElkPoint;
    endPoint: ElkPoint;
    bendPoints?: ElkPoint[];
    incomingShape?: string;
    outgoingShape?: string;
    incomingSections?: string[];
    outgoingSections?: string[];
  }

  export interface ELKLayoutArguments {
    layoutOptions?: LayoutOptions;
  }

  export interface ELKInterface {
    layout(graph: ElkNode, args?: ELKLayoutArguments): Promise<ElkNode>;
  }

  export interface ELKConstructorArguments {
    defaultLayoutOptions?: LayoutOptions;
    algorithms?: string[];
    workerUrl?: string;
  }

  export default class ELK implements ELKInterface {
    constructor(args?: ELKConstructorArguments);
    layout(graph: ElkNode, args?: ELKLayoutArguments): Promise<ElkNode>;
  }
}
