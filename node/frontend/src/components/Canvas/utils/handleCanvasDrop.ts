import { CanvasNode, ExportNode } from "@coordnet/core";
import { XYPosition } from "@xyflow/react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { toast } from "sonner";
import * as Y from "yjs";

import { ALLOWED_TAGS, FORBID_ATTR } from "@/constants";
import { importNodeCanvas } from "@/lib/nodes";
import { readPdf } from "@/lib/pdfjs";
import { BackendEntityType, BackendParent, SpaceNode } from "@/types";

import { addNodeToCanvas, addNodeToSkillCanvas } from "./";
import { importMarkmap } from "./markmapImport";

export const handleCanvasDrop = async (
  dataTransfer: React.DragEvent<Element>["dataTransfer"],
  takeSnapshot: () => void,
  parent: BackendParent,
  nodesMap: Y.Map<CanvasNode>,
  spaceMap: Y.Map<SpaceNode>,
  startPos: XYPosition,
  spaceDoc: Y.Doc,
  spaceId: string | undefined,
  canvasId: string | undefined
) => {
  const isSkill = parent.type === BackendEntityType.SKILL;
  const transferredHtml = dataTransfer.getData("text/html");

  // Handle HTML content from editor drag operations
  if (transferredHtml && !dataTransfer.files.length) {
    takeSnapshot();
    const parser = new DOMParser();
    const doc = parser.parseFromString(transferredHtml, "text/html");
    const listItems = doc.querySelectorAll("li");

    // Handle list items specially
    if (listItems.length > 0) {
      listItems.forEach((li, index) => {
        const liPosition: XYPosition = { x: startPos.x + index * 25, y: startPos.y + index * 50 };
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = li.innerHTML;
        tempDiv.querySelectorAll("ul, ol").forEach((subList) => subList.remove());
        const cleaned = DOMPurify.sanitize(tempDiv, { ALLOWED_TAGS, FORBID_ATTR });
        addNodeToCanvas(nodesMap, spaceMap, cleaned, liPosition);
      });
    } else {
      // Normal HTML content
      const cleaned = DOMPurify.sanitize(transferredHtml, { ALLOWED_TAGS, FORBID_ATTR });
      addNodeToCanvas(nodesMap, spaceMap, cleaned, startPos);
    }
    return;
  }

  // If no files or HTML, create a new empty node
  if (!dataTransfer.files.length && !transferredHtml) {
    takeSnapshot();
    addNodeToCanvas(nodesMap, spaceMap, "New node", startPos, "", { editing: true });
    return;
  }

  // Process files
  if (dataTransfer.files.length > 0) {
    // If there are over 100 files then show a confirmation
    if (
      dataTransfer.files.length > 100 &&
      !window.confirm(
        `You are about to import ${dataTransfer.files.length} files. In the current version of ` +
          `the app you may experienve peformance issues with a large amount of files. ` +
          `Are you sure you want to continue?`
      )
    ) {
      return;
    }

    takeSnapshot();
    const filesArray = Array.from(dataTransfer.files);
    const total = filesArray.length;
    let processedFiles = 0;
    const failedFiles: Array<{ name: string; error: unknown }> = [];

    const toastId = toast.loading(`Processing files: 0/${total} complete`);

    try {
      // Process files one by one sequentially
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        toast.loading(`Processing (${i + 1}/${total}) "${file.name}"`, { id: toastId });

        try {
          const pos = {
            x: startPos.x + (processedFiles % 6) * 210,
            y: startPos.y + Math.floor(processedFiles / 6) * 50,
          };

          // PDF file processing
          if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const htmlContent = await readPdf(arrayBuffer);
            const title = file.name.replace(/\.pdf$/i, "");

            if (isSkill) {
              await addNodeToSkillCanvas(nodesMap, spaceMap, spaceDoc, title, pos, htmlContent);
            } else {
              await addNodeToCanvas(nodesMap, spaceMap, title, pos, htmlContent);
            }
          }

          // Markdown file processing
          else if (file.name.endsWith(".md")) {
            const arrayBuffer = await file.arrayBuffer();
            const markdown = new TextDecoder().decode(arrayBuffer);
            const html = DOMPurify.sanitize(await marked.parse(markdown));
            const filename = file.name.replace(/\.md$/i, "");

            if (isSkill) {
              await addNodeToSkillCanvas(nodesMap, spaceMap, spaceDoc, filename, pos, html);
            } else {
              await addNodeToCanvas(nodesMap, spaceMap, filename, pos, html);
            }
          }

          // Node import file processing
          else if (!isSkill && file.name.endsWith(".coordnode")) {
            const arrayBuffer = await file.arrayBuffer();
            const importNode: ExportNode = JSON.parse(new TextDecoder().decode(arrayBuffer));
            const { title, content, data, nodes } = importNode;

            const id = await addNodeToCanvas(nodesMap, spaceMap, title, pos, content, data);
            if (nodes.length && parent.type === BackendEntityType.SPACE && parent.data) {
              await importNodeCanvas(parent.data.id, id, importNode);
            }
          }

          // Markmap file processing
          else if (!isSkill && file.name.endsWith(".markmap")) {
            const arrayBuffer = await file.arrayBuffer();
            const markdown = new TextDecoder().decode(arrayBuffer);
            await importMarkmap(spaceId, canvasId, markdown, pos, 100);
          }

          // Skip unsupported file types
          else {
            failedFiles.push({
              name: file.name,
              error: `Unsupported file type: ${file.type || "unknown"}`,
            });
            continue;
          }

          processedFiles++;
          toast.loading(`Processing files: ${processedFiles}/${total} complete`, { id: toastId });
        } catch (error) {
          failedFiles.push({ name: file.name, error });
          console.error(`Error processing "${file.name}":`, error);
        }
      }

      // Show final status
      if (failedFiles.length === 0) {
        toast.success(`Processed all ${total} files successfully`, { id: toastId, duration: 3000 });
      } else {
        toast.info(`Processed ${processedFiles} of ${total} files`, {
          description: `Failed to process ${failedFiles.length} files. Check the browser console for details.`,
          duration: Infinity,
          cancel: { label: "OK", onClick: () => toast.dismiss() },
          id: toastId,
        });
        console.error("Failed files:", failedFiles);
      }
    } catch (error) {
      toast.error("Error processing files", {
        id: toastId,
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        duration: 5000,
      });
      console.error("Error during file processing:", error);
    }
  }
};
