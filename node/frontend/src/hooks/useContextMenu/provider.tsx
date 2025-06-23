import { Node } from "@xyflow/react";
import React, { ReactNode, useCallback, useState } from "react";
import { useParams } from "react-router-dom";

import { useCanvas, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

import { ContextMenuContext, ContextMenuTargetInfo } from "./context";

export const ContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentContextMenuData, setCurrentContextMenuData] =
    useState<ContextMenuTargetInfo | null>(null);

  const setContextMenuData = useCallback((targetInfo: ContextMenuTargetInfo | null) => {
    setCurrentContextMenuData(targetInfo);
  }, []);

  const { runId } = useParams();
  const { nodes, nodeFeatures } = useCanvas();
  const { parent, scope } = useYDoc();
  const isSkill = parent.type === BackendEntityType.SKILL;

  const onNodeContextMenuHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (!isSkill && scope === YDocScope.READ_ONLY) return;

      const isSkillRun = isSkill && !!runId;
      const shouldDisableMenu = isSkill && !isSkillRun;

      if (shouldDisableMenu) {
        setContextMenuData(null);
        return;
      }

      const selectedNodes = nodes.filter((n) => n.selected);
      const isPartOfSelection = selectedNodes.some((n) => n.id === node.id);
      const isMultiSelection = isPartOfSelection && selectedNodes.length > 1;

      let targetNodeIds: string[];
      let hasCanvas: boolean;

      if (isMultiSelection) {
        targetNodeIds = selectedNodes.map((n) => n.id);
        hasCanvas = selectedNodes.some((n) => nodeFeatures(n.id).hasCanvas);
      } else {
        targetNodeIds = [node.id];
        hasCanvas = nodeFeatures(node.id).hasCanvas;
      }

      setContextMenuData({
        nodeIds: targetNodeIds,
        position: { x: event.clientX, y: event.clientY },
        isSkill: shouldDisableMenu,
        hasCanvas: hasCanvas,
        isMultiSelection: isMultiSelection,
        isSkillRun: isSkillRun,
      });
    },
    [isSkill, scope, runId, nodes, setContextMenuData, nodeFeatures]
  );

  const onSelectionContextMenuHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (scope === YDocScope.READ_ONLY) return;

      const isCanvasWithinSkill = parent.type === BackendEntityType.SKILL;
      const shouldDisableMenu = isCanvasWithinSkill;

      if (shouldDisableMenu) {
        setContextMenuData(null);
        return;
      }

      const hasCanvas = nodes.some((node) => nodeFeatures(node.id).hasCanvas);

      setContextMenuData({
        nodeIds: nodes.map((node) => node.id),
        position: { x: event.clientX, y: event.clientY },
        isSkill: shouldDisableMenu,
        hasCanvas: hasCanvas,
        isMultiSelection: true,
      });
    },
    [nodeFeatures, nodes, parent.type, scope, setContextMenuData]
  );

  const handlePaneClick = useCallback(() => {
    setContextMenuData(null);
  }, [setContextMenuData]);

  return (
    <ContextMenuContext.Provider
      value={{
        currentContextMenuData,
        setContextMenuData,
        onNodeContextMenuHandler,
        onSelectionContextMenuHandler,
        handlePaneClick,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
};
