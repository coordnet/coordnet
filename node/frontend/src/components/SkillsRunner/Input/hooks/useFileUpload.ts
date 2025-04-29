import { generateJSON, JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useRef, useState } from "react";

import { convertWithMarkItDown } from "@/api";
import { readPdf } from "@/lib/pdfjs";
import { extensions } from "@/lib/readOnlyEditor";
import { SkillsRunnerInput } from "@/types";

import { getFileTypeInfo } from "../../utils";

interface FileUploadStatus {
  status: "pending" | "success" | "error";
  filename: string;
  error?: string;
}

interface UseFileUploadProps {
  onAddInput: (newInput: SkillsRunnerInput) => void;
}

export function useFileUpload({ onAddInput }: UseFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, FileUploadStatus>>({});

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    // Set initial pending status
    const initialStatus: Record<string, FileUploadStatus> = {};
    const fileIdMap: Record<string, string> = {}; // Map filename to generated fileId
    filesArray.forEach((file) => {
      const fileId = crypto.randomUUID();
      initialStatus[fileId] = { status: "pending", filename: file.name };
      fileIdMap[file.name] = fileId;
    });
    setUploadStatus((prev) => ({ ...prev, ...initialStatus }));

    // Process each file
    for (const file of filesArray) {
      const fileId = fileIdMap[file.name];
      if (!fileId) continue; // Should not happen with the map

      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const { type } = getFileTypeInfo(fileExtension);

      try {
        // Attempt conversion via API
        const result = await convertWithMarkItDown(file);
        if (result.status === "success" && result.text_content) {
          const markdown = DOMPurify.sanitize(result.text_content);
          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], status: "success" },
          }));
          const html = await marked.parse(markdown);
          const content = generateJSON(html, extensions);
          onAddInput({ id: fileId, type, name: file.name, content });
        } else {
          throw new Error(result.error || "Conversion failed, attempting fallback.");
        }
      } catch (error) {
        console.warn("API conversion failed or skipped, trying fallback:", error);
        // Fallback processing
        try {
          let content: JSONContent = {};
          if (fileExtension === "pdf") {
            const text = await readPdf(await file.arrayBuffer());
            content = generateJSON(text, extensions);
          } else if (fileExtension === "md") {
            const markdown = await file.text();
            const html = DOMPurify.sanitize(await marked.parse(markdown));
            content = generateJSON(html, extensions);
          } else if (fileExtension === "txt") {
            const text = DOMPurify.sanitize(await file.text());
            content = generateJSON(text, extensions);
          } else {
            throw new Error(`Cannot process file type '${fileExtension}' locally.`);
          }

          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], status: "success" },
          }));
          onAddInput({ id: fileId, type, name: file.name, content });
        } catch (fallbackError) {
          console.error("Fallback processing failed:", fallbackError);
          const errorMessage =
            fallbackError instanceof Error ? fallbackError.message : "Unknown fallback error";
          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], status: "error", error: errorMessage },
          }));
          // Still add input, but mark as errored
          onAddInput({ id: fileId, type, name: file.name, content: {}, error: errorMessage });
        }
      }
    }

    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const pendingUploads = Object.values(uploadStatus).filter(
    (status) => status.status === "pending"
  ).length;

  // Function to clear a specific status (optional, useful if you want to remove error messages later)
  const clearStatus = (id: string) => {
    setUploadStatus((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  return {
    fileInputRef,
    uploadStatus, // May not be needed directly by the component if only pending count matters
    pendingUploads,
    handleFileChange,
    handleFileDrop,
    triggerFileInput,
    clearStatus, // Optional
  };
}
