import { Node } from "@xyflow/react";
import { createContext } from "react";

export interface ContextMenuTargetInfo {
  nodeIds: string[];
  position: { x: number; y: number };
  isSkill: boolean;
  hasCanvas?: boolean;
  isMultiSelection: boolean;
  isSkillRun?: boolean;
}

interface ContextMenuContextType {
  currentContextMenuData: ContextMenuTargetInfo | null;
  setContextMenuData: (targetInfo: ContextMenuTargetInfo | null) => void;
  onNodeContextMenuHandler: (event: React.MouseEvent, node: Node) => void;
  onSelectionContextMenuHandler: (event: React.MouseEvent, nodes: Node[]) => void;
  handlePaneClick: () => void;
}

/**
 * Context for sharing context menu state in the canvas
 */
export const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);
