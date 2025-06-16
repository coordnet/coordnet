import { CanvasNode } from "@coordnet/core";
import { saveAs } from "file-saver";
import { useCallback } from "react";
import { toast } from "sonner";
import * as Y from "yjs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useContextMenu, useNodeCopy, useYDoc } from "@/hooks";
import { exportNode, slugifyNodeTitle } from "@/lib/nodes";
import { NodeSearchResult, SpaceNode } from "@/types";

import { copyNodesToSpace } from "./utils";

interface CanvasContextMenuProps {
  nodesMap: Y.Map<CanvasNode> | undefined;
  spaceMap: Y.Map<SpaceNode> | undefined;
}

const CanvasContextMenu = ({ nodesMap, spaceMap }: CanvasContextMenuProps) => {
  const { currentContextMenuData, setContextMenuData } = useContextMenu();
  const { edges, edgesMap } = useCanvas();
  const { setIsNodeSelectorOpen, setOnNodeSelect } = useNodeCopy();
  const {
    editor: { YDoc: skillDoc },
  } = useYDoc();

  const handleExportNode = useCallback(
    async (nodeId: string, includeSubNodes = false) => {
      if (!nodesMap || !spaceMap || !currentContextMenuData) {
        toast.error("Cannot export node: data not available.");
        return;
      }
      toast.promise(exportNode(nodeId, nodesMap, spaceMap, includeSubNodes), {
        loading: "Exporting...",
        success: (data) => {
          if (data) {
            const title = slugifyNodeTitle(data.title);
            const exportData = { nodes: [{ ...data, position: { x: 0, y: 0 } }], edges: [] };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: "application/json",
            });
            saveAs(blob, `node-${data.id.slice(0, 8)}-${title}.coordnode`);
          }
          return "Node exported";
        },
        error: (err) => {
          console.error("Export error:", err);
          return "Error exporting node";
        },
      });
    },
    [nodesMap, spaceMap, currentContextMenuData]
  );

  const handleExportMultipleNodes = useCallback(
    async (nodeIds: string[], includeSubNodes = false) => {
      if (!nodesMap || !spaceMap || !currentContextMenuData) {
        toast.error("Cannot export nodes: data not available.");
        return;
      }

      const exportPromises = nodeIds.map((nodeId) =>
        exportNode(nodeId, nodesMap, spaceMap, includeSubNodes)
      );

      toast.promise(Promise.all(exportPromises), {
        loading: `Exporting ${nodeIds.length} nodes...`,
        success: (dataArray) => {
          const validData = dataArray.filter((data) => data !== null);
          if (validData.length > 0) {
            // Calculate relative positions for all nodes
            const minX = Math.min(...validData.map((node) => node.position.x));
            const minY = Math.min(...validData.map((node) => node.position.y));

            // Convert absolute positions to relative positions
            const dataWithRelativePositions = validData.map((node) => ({
              ...node,
              position: { x: node.position.x - minX, y: node.position.y - minY },
            }));

            // Find edges between the selected nodes
            const nodeIdSet = new Set(nodeIds);
            const relevantEdges = edges.filter(
              (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
            );

            // Create export data with unified format
            const exportData = { nodes: dataWithRelativePositions, edges: relevantEdges };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: "application/json",
            });
            const timestamp = new Date().toISOString().slice(0, 10);
            saveAs(blob, `nodes-export-${validData.length}-${timestamp}.coordnode`);
          }
          return `${validData.length} nodes exported`;
        },
        error: (err) => {
          console.error("Export error:", err);
          return "Error exporting nodes";
        },
      });
    },
    [nodesMap, spaceMap, currentContextMenuData, edges]
  );

  const handleCopyNodesToSpace = useCallback(
    (nodeIds: string[], includeSubNodes: boolean) => {
      const copyHandler = async (targetNode: NodeSearchResult) => {
        console.log("Copy handler called with target:", targetNode);
        if (!nodesMap || !spaceMap) {
          toast.error("Copy operation failed: missing data");
          return;
        }

        const nodeText = `${nodeIds.length} node${nodeIds.length > 1 ? "s" : ""}`;

        toast.promise(
          copyNodesToSpace(
            skillDoc,
            nodeIds,
            targetNode.space,
            targetNode.id,
            nodesMap,
            spaceMap,
            edgesMap,
            includeSubNodes
          ),
          {
            loading: `Copying ${nodeText} to space...`,
            success: (processedCount) => {
              return `Successfully copied ${processedCount} node${processedCount > 1 ? "s" : ""} to target space`;
            },
            error: (err) => {
              console.error("Failed to copy nodes:", err);
              return "Failed to copy nodes to target space";
            },
          }
        );
      };

      // Set the handler and open the selector
      setOnNodeSelect(() => copyHandler);
      setIsNodeSelectorOpen(true);
      setContextMenuData(null);
    },
    [
      setOnNodeSelect,
      setIsNodeSelectorOpen,
      setContextMenuData,
      nodesMap,
      spaceMap,
      skillDoc,
      edgesMap,
    ]
  );

  if (
    !currentContextMenuData ||
    (currentContextMenuData.isSkill && !currentContextMenuData.isSkillRun)
  ) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={true} onOpenChange={(open) => !open && setContextMenuData(null)}>
        <DropdownMenuTrigger asChild>
          <div
            style={{
              position: "fixed",
              left: `${currentContextMenuData.position.x}px`,
              top: `${currentContextMenuData.position.y}px`,
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="z-[1000] w-[200px]"
          align="start"
          side="bottom"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {currentContextMenuData.isSkillRun ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (currentContextMenuData) {
                    handleCopyNodesToSpace(currentContextMenuData.nodeIds, false);
                  }
                }}
              >
                {currentContextMenuData.isMultiSelection
                  ? `Copy ${currentContextMenuData.nodeIds.length} Nodes to Space`
                  : "Copy Node to Space"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (currentContextMenuData) {
                    handleCopyNodesToSpace(currentContextMenuData.nodeIds, true);
                  }
                }}
              >
                {currentContextMenuData.isMultiSelection
                  ? `Copy ${currentContextMenuData.nodeIds.length} Node Graph Contents to Space`
                  : "Copy Node Graph Contents to Space"}
              </DropdownMenuItem>
            </>
          ) : currentContextMenuData.isMultiSelection ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (currentContextMenuData) {
                    handleExportMultipleNodes(currentContextMenuData.nodeIds, false);
                    setContextMenuData(null);
                  }
                }}
              >
                Export {currentContextMenuData.nodeIds.length} Nodes
              </DropdownMenuItem>
              {currentContextMenuData?.hasCanvas && (
                <DropdownMenuItem
                  onClick={() => {
                    if (currentContextMenuData) {
                      handleExportMultipleNodes(currentContextMenuData.nodeIds, true);
                      setContextMenuData(null);
                    }
                  }}
                >
                  Export {currentContextMenuData.nodeIds.length} Nodes & Canvas Nodes
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (currentContextMenuData) {
                    handleExportNode(currentContextMenuData.nodeIds[0], false);
                    setContextMenuData(null);
                  }
                }}
              >
                Export Node
              </DropdownMenuItem>
              {currentContextMenuData?.hasCanvas && (
                <DropdownMenuItem
                  onClick={() => {
                    if (currentContextMenuData) {
                      handleExportNode(currentContextMenuData.nodeIds[0], true);
                      setContextMenuData(null);
                    }
                  }}
                >
                  Export Node & Canvas Nodes
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default CanvasContextMenu;
