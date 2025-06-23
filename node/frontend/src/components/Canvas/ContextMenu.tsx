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

import {
  copyCanvasNodesToSpaceNode,
  copyNodesToSpace,
  copyTitleAndNodePageToSpaceNode,
  normalizeNodePositions,
} from "./utils";

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
            const nodeIdSet = new Set(nodeIds);
            const exportData = {
              nodes: normalizeNodePositions(validData),
              edges: edges.filter(
                (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
              ),
            };

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
            loading: `Copying ${nodeIds.length} node${nodeIds.length > 1 ? "s" : ""} to space...`,
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

  const handleCopyTitleAndNodePageToSpaceNode = useCallback(
    (nodeId: string) => {
      const copyHandler = async (targetNode: NodeSearchResult) => {
        if (!nodesMap || !spaceMap) {
          toast.error("Copy operation failed: missing data");
          return;
        }

        toast.promise(
          copyTitleAndNodePageToSpaceNode(
            skillDoc,
            nodeId,
            targetNode.space,
            targetNode.id,
            nodesMap,
            spaceMap
          ),
          {
            loading: "Copying title and node page to space node...",
            success: () => {
              return "Successfully copied title and node page to space node";
            },
            error: (err) => {
              console.error("Failed to copy title and node page:", err);
              return "Failed to copy title and node page to space node";
            },
          }
        );
      };

      // Set the handler and open the selector
      setOnNodeSelect(() => copyHandler);
      setIsNodeSelectorOpen(true);
      setContextMenuData(null);
    },
    [setOnNodeSelect, setIsNodeSelectorOpen, setContextMenuData, nodesMap, spaceMap, skillDoc]
  );

  const handleCopyCanvasNodesToSpaceNode = useCallback(
    (nodeId: string) => {
      const copyHandler = async (targetNode: NodeSearchResult) => {
        if (!nodesMap || !spaceMap) {
          toast.error("Copy operation failed: missing data");
          return;
        }

        toast.promise(
          copyCanvasNodesToSpaceNode(
            skillDoc,
            nodeId,
            targetNode.space,
            targetNode.id,
            nodesMap,
            spaceMap
          ),
          {
            loading: "Copying canvas nodes to space node...",
            success: (processedCount) => {
              return `Successfully copied ${processedCount} canvas nodes to space node`;
            },
            error: (err) => {
              console.error("Failed to copy canvas nodes:", err);
              return "Failed to copy canvas nodes to space node";
            },
          }
        );
      };

      // Set the handler and open the selector
      setOnNodeSelect(() => copyHandler);
      setIsNodeSelectorOpen(true);
      setContextMenuData(null);
    },
    [setOnNodeSelect, setIsNodeSelectorOpen, setContextMenuData, nodesMap, spaceMap, skillDoc]
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
          className="z-[1000] w-[300px]"
          align="start"
          side="bottom"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {currentContextMenuData.isSkillRun ? (
            <>
              {!currentContextMenuData.isMultiSelection && (
                <DropdownMenuItem
                  onClick={() => {
                    if (currentContextMenuData) {
                      handleCopyTitleAndNodePageToSpaceNode(currentContextMenuData.nodeIds[0]);
                    }
                  }}
                >
                  Copy title and node page to a space node
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (currentContextMenuData) {
                    handleCopyNodesToSpace(currentContextMenuData.nodeIds, true);
                  }
                }}
              >
                {currentContextMenuData.isMultiSelection
                  ? `Add ${currentContextMenuData.nodeIds.length} nodes to a space node's canvas`
                  : "Add node to a space node's canvas"}
              </DropdownMenuItem>
              {!currentContextMenuData.isMultiSelection && (
                <DropdownMenuItem
                  onClick={() => {
                    if (currentContextMenuData) {
                      handleCopyCanvasNodesToSpaceNode(currentContextMenuData.nodeIds[0]);
                    }
                  }}
                >
                  Add canvas nodes to a space node&apos;s canvas
                </DropdownMenuItem>
              )}
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
