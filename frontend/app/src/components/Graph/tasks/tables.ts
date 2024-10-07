import { generateJSON } from "@tiptap/core";
import DOMPurify from "dompurify";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { toast } from "sonner";
import * as Y from "yjs";
import { z, ZodString } from "zod";

import { getCanvas } from "@/lib/canvases";
import { getNodePageContent, setNodePageContent } from "@/lib/nodes";
import { mergeJSONContent } from "@/lib/proseMirror";
import { extensions } from "@/lib/readOnlyEditor";
import { SpaceNode } from "@/types";

import { client } from "./executeTasks";
import { TableResponse, Task } from "./types";
import { formatTitleToKey } from "./utils";

export const executeTableTask = async (
  task: Task,
  messages: ChatCompletionMessageParam[],
  cancelRef: React.MutableRefObject<boolean>,
  spaceNodesMap: Y.Map<SpaceNode>,
) => {
  try {
    if (!task?.outputNode?.id) {
      toast.error("Output node not found");
      return;
    }

    // Get the table columns from the node
    const { nodes } = await getCanvas(task.outputNode.id);

    const schemaShape: { [k: string]: ZodString } = {};
    const columnMap: { [k: string]: string } = {};
    for (const node of nodes) {
      const spaceNode = spaceNodesMap.get(node.id);
      const title = spaceNode?.title;
      const content = await getNodePageContent(node.id);
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
      model: "gpt-4o",
      stream: true,
      response_model: { schema: TableSchema, name: "TableSchema" },
    });

    if (cancelRef.current) return;

    let extractedTableData: TableResponse<typeof TableSchema> = {};
    try {
      for await (const result of response) {
        if (cancelRef.current) break;
        extractedTableData = result;
      }
    } catch (e) {
      toast.error("Error when calling LLM, check console for details");
      console.error(e);
    }

    if (cancelRef.current) return;

    // Generate HTML table
    const tableHTML = generateHTMLTable(columnMap, extractedTableData.data || []);

    // Set the HTML table to the node content
    const pageContent = await getNodePageContent(task?.outputNode?.id ?? "", "json");
    let json = generateJSON(tableHTML, extensions);
    if (pageContent) {
      json = mergeJSONContent(pageContent, json);
    }
    await setNodePageContent(json, task?.outputNode?.id ?? "");
  } catch (e) {
    console.error(e);
    toast.error("Error when calling LLM, check console for details");
  }
};

/**
 * Generates an HTML table string from column mappings and data.
 * @param columnMap An object mapping keys to display column names.
 * @param data An array of data objects representing table rows.
 * @returns A string containing the HTML table.
 */
const generateHTMLTable = (
  columnMap: { [key: string]: string },
  data: Array<{ [key: string]: string }>,
): string => {
  const headers = Object.values(columnMap);

  const html = `
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse;">
      <thead>
        <tr>
          ${headers
            .map((header) => `<th>${DOMPurify.sanitize(header, { ALLOWED_TAGS: [] })}</th>`)
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${Object.keys(columnMap)
              .map((key) => {
                const cellData = row[key] !== undefined && row[key] !== null ? row[key] : "";
                return `<td>${DOMPurify.sanitize(cellData, { ALLOWED_TAGS: [] })}</td>`;
              })
              .join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  return html;
};
