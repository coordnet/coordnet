import { JSONContent } from "@tiptap/core";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as Y from "yjs";
import { z, ZodString } from "zod";

import { Buddy, CanvasNode, SpaceNode, TableResponse, Task } from "../types";
import { getSkillNodePageContent } from "../utils";
import { client } from "./executeTasks";
import { formatTitleToKey, getSkillNodeCanvas, setSkillNodePageContent } from "./utils";

export const executeTableTask = async (
  task: Task,
  messages: ChatCompletionMessageParam[],
  skillDoc: Y.Doc,
  cancelRef: React.RefObject<boolean | null>,
  spaceNodesMap: Y.Map<SpaceNode>,
  buddy: Buddy,
  outputNode: CanvasNode,
  isLastTask: boolean,
) => {
  try {
    if (!task?.outputNode?.id) {
      console.error("Output node not found");
      return;
    }

    // Get the table columns from the node
    const { nodes } = getSkillNodeCanvas(task.outputNode.id, skillDoc);

    // Sort the nodes by y position to get the order of columns
    const sortedNodes = nodes.slice().sort((a, b) => {
      const yA = a.position?.y ?? 0;
      const yB = b.position?.y ?? 0;
      return yA - yB;
    });

    const schemaShape: { [k: string]: ZodString } = {};
    const columnMap: { [k: string]: string } = {};
    for (const node of sortedNodes) {
      const spaceNode = spaceNodesMap.get(node.id);
      const title = spaceNode?.title;
      const content = getSkillNodePageContent(node.id, skillDoc);
      if (title) {
        const key = formatTitleToKey(title);
        schemaShape[key] = z.string().describe(content!);
        columnMap[key] = title;
      }
    }

    // Create a schema for the columns
    const TableSchema = z.object({
      data: z.array(z.object(schemaShape).describe("A list of table columns")),
    });

    const response = await client.chat.completions.create({
      messages,
      model: buddy.model,
      stream: false,
      response_model: { schema: TableSchema, name: "TableSchema" },
    });

    if (cancelRef.current) return;

    let extractedTableData: TableResponse<typeof TableSchema> = {};
    try {
      extractedTableData = response;
    } catch (e) {
      console.error("Error when calling LLM, check console for details");
      console.error(e);
    }

    if (cancelRef.current) return;

    // Get the page content as JSON
    let pageContent: JSONContent = (await getSkillNodePageContent(
      task?.outputNode?.id ?? "",
      skillDoc,
      "json",
    )) as JSONContent;

    if (!pageContent) {
      // Initialize an empty document
      pageContent = { type: "doc", content: [] };
    }

    // Process the document to find matching tables and update them
    const givenHeaders = Object.values(columnMap);
    let matchingTable: JSONContent | null = null;

    // Find all tables in the document
    const tables: JSONContent[] = findTables(pageContent);

    // Search for a matching table
    for (const table of tables) {
      const headers = extractTableHeaders(table);
      if (headersMatch(headers, givenHeaders)) {
        matchingTable = table;
        break;
      }
    }

    if (matchingTable) {
      // Append data to the existing matching table
      for (const rowData of extractedTableData.data || []) {
        const tableRow: JSONContent = dataRowToTableRow(rowData, Object.keys(columnMap));
        if (matchingTable.content) {
          matchingTable.content.push(tableRow);
        }
      }
    } else {
      // Create a new table and append it to the document
      const newTable: JSONContent = {
        type: "table",
        content: [],
      };
      // Create header row
      const headerCells: JSONContent[] = [];
      for (const key of Object.keys(columnMap)) {
        const headerText = columnMap[key];
        const headerCell: JSONContent = {
          type: "tableHeader",
          attrs: { colspan: 1, rowspan: 1 },
          content: [{ type: "paragraph", content: [{ type: "text", text: headerText }] }],
        };
        headerCells.push(headerCell);
      }
      const headerRow: JSONContent = { type: "tableRow", content: headerCells };
      newTable.content?.push(headerRow);
      // Add data rows
      for (const rowData of extractedTableData.data || []) {
        const tableRow: JSONContent = dataRowToTableRow(rowData, Object.keys(columnMap));
        newTable.content?.push(tableRow);
      }
      // Add new table to the document
      pageContent.content?.push(newTable);
    }

    // Set the updated document as the node content
    [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (id) => {
      if (id) await setSkillNodePageContent(pageContent, id, skillDoc);
    });
  } catch (e) {
    console.error(e);
    console.error("Error when calling LLM, check console for details");
  }
};

// Function to find all tables in the document
const findTables = (doc: JSONContent): JSONContent[] => {
  const tables: JSONContent[] = [];
  const traverse = (node: JSONContent) => {
    if (node.type === "table") {
      tables.push(node);
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  };
  traverse(doc);
  return tables;
};

// Function to extract header texts from a table
const extractTableHeaders = (table: JSONContent): string[] => {
  const headers: string[] = [];
  const firstRow = table.content && table.content[0];
  if (firstRow && firstRow.type === "tableRow") {
    for (const cell of firstRow.content || []) {
      if (cell.type === "tableHeader") {
        let cellText = "";
        for (const paragraph of cell.content || []) {
          if (paragraph.type === "paragraph") {
            for (const textNode of paragraph.content || []) {
              if (textNode.type === "text") {
                cellText += textNode.text;
              }
            }
          }
        }
        headers.push(cellText.trim());
      }
    }
  }
  return headers;
};

// Function to check if two header arrays are equal
const headersMatch = (tableHeaders: string[], givenHeaders: string[]): boolean => {
  if (tableHeaders.length !== givenHeaders.length) {
    return false;
  }
  for (let i = 0; i < tableHeaders.length; i++) {
    if (tableHeaders[i] !== givenHeaders[i]) {
      return false;
    }
  }
  return true;
};

// Function to convert data row to TipTap table row
const dataRowToTableRow = (rowData: Record<string, string>, columnKeys: string[]): JSONContent => {
  const cells: JSONContent[] = [];
  for (const key of columnKeys) {
    const cellText = rowData[key] || "";
    const cellNode: JSONContent = {
      type: "tableCell",
      attrs: {
        colspan: 1,
        rowspan: 1,
      },
      content: [
        {
          type: "paragraph",
          content: cellText
            ? [
                {
                  type: "text",
                  text: cellText,
                },
              ]
            : [],
        },
      ],
    };
    cells.push(cellNode);
  }
  return {
    type: "tableRow",
    content: cells,
  };
};
