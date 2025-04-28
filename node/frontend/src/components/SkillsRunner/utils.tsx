import clsx from "clsx";
import { FileChartColumn, FileCode, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { ReactNode } from "react";

import { SkillsRunnerInputType } from "@/types";

export const getFileTypeInfo = (
  extension: string | undefined
): { type: SkillsRunnerInputType; icon: ReactNode } => {
  const baseClass = "size-4 shrink-0";
  if (!extension) {
    return { type: "txt", icon: <FileText className={clsx(baseClass, "text-gray-500")} /> };
  }

  switch (extension.toLowerCase()) {
    case "pdf":
      return { type: "pdf", icon: <FileText className={clsx(baseClass, "text-red-500")} /> };
    case "md":
      return { type: "md", icon: <FileText className={clsx(baseClass, "text-blue-500")} /> };
    case "docx":
    case "doc":
      return { type: "doc", icon: <FileText className={clsx(baseClass, "text-blue-700")} /> };
    case "xlsx":
    case "xls":
      return {
        type: "xls",
        icon: <FileSpreadsheet className={clsx(baseClass, "text-green-700")} />,
      };
    case "pptx":
    case "ppt":
      return {
        type: "ppt",
        icon: <FileChartColumn className={clsx(baseClass, "text-orange-600")} />,
      };
    case "html":
    case "htm":
      return { type: "html", icon: <FileCode className={clsx(baseClass, "text-purple-600")} /> };
    case "csv":
      return {
        type: "csv",
        icon: <FileSpreadsheet className={clsx(baseClass, "text-green-500")} />,
      };
    case "json":
      return { type: "json", icon: <FileJson className={clsx(baseClass, "text-yellow-600")} /> };
    case "xml":
      return { type: "xml", icon: <FileText className={clsx(baseClass, "text-teal-500")} /> };
    case "epub":
      return { type: "epub", icon: <FileText className={clsx(baseClass, "text-indigo-600")} /> };
    default:
      return { type: "txt", icon: <FileText className={clsx(baseClass, "text-gray-500")} /> };
  }
};
