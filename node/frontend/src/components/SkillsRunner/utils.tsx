import { FileChartColumn, FileCode, FileJson, FileSpreadsheet, FileUp } from "lucide-react";
import { ReactNode } from "react";

import { SkillsRunnerInputType } from "@/types";

export const getFileTypeInfo = (
  extension: string | undefined
): { type: SkillsRunnerInputType; icon: ReactNode } => {
  const baseClass = "size-4 shrink-0 text-green-500";
  if (!extension) {
    return { type: "txt", icon: <FileUp className={baseClass} /> };
  }

  switch (extension.toLowerCase()) {
    case "pdf":
      return { type: "pdf", icon: <FileUp className={baseClass} /> };
    case "md":
      return { type: "md", icon: <FileUp className={baseClass} /> };
    case "docx":
    case "doc":
      return { type: "doc", icon: <FileUp className={baseClass} /> };
    case "xlsx":
    case "xls":
      return { type: "xls", icon: <FileSpreadsheet className={baseClass} /> };
    case "pptx":
    case "ppt":
      return { type: "ppt", icon: <FileChartColumn className={baseClass} /> };
    case "html":
    case "htm":
      return { type: "html", icon: <FileCode className={baseClass} /> };
    case "csv":
      return { type: "csv", icon: <FileSpreadsheet className={baseClass} /> };
    case "json":
      return { type: "json", icon: <FileJson className={baseClass} /> };
    case "xml":
      return { type: "xml", icon: <FileUp className={baseClass} /> };
    case "epub":
      return { type: "epub", icon: <FileUp className={baseClass} /> };
    default:
      return { type: "txt", icon: <FileUp className={baseClass} /> };
  }
};
