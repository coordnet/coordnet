import clsx from "clsx";
import { Upload, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import AvatarEditor from "react-avatar-editor";
import { useDropzone } from "react-dropzone";
import { Tooltip } from "react-tooltip";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import bannerPlaceholder from "./assets/banner-placeholder.svg?url";

interface ImageUploaderProps {
  image: string;
  type: "avatar" | "banner";
  onImageChange: React.Dispatch<React.SetStateAction<string | null>>;
  editorOptions: {
    width: number;
    height: number;
    borderRadius: number;
  };
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

const ImageUpload: React.FC<ImageUploaderProps> = ({
  image,
  type,
  onImageChange,
  editorOptions,
  isDragging,
  fileInputRef,
  className,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorScale, setEditorScale] = useState(1);
  const editorRef = useRef<AvatarEditor>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setEditorOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
  });

  const handleSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      onImageChange(dataUrl);
      setEditorOpen(false);
    }
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={clsx(
          "bg-cover bg-center",
          isDragActive && "outline outline-2 outline-blue-500",
          className
        )}
        style={{ backgroundImage: `url("${image}")` }}
      >
        {isDragging && (
          <div
            className={clsx(
              `absolute flex h-full w-full items-center justify-center bg-gray-200 text-center
              text-xs font-medium text-gray-4`,
              type == "avatar" ? "rounded-full" : "rounded-lg"
            )}
          >
            Drop here
            <Upload className="ml-2 size-3" />
          </div>
        )}
        {Boolean(type == "banner" && image == bannerPlaceholder) && (
          <div className="text-sm font-medium leading-tight text-neutral-800">Banner Image</div>
        )}
        <input {...getInputProps()} />
        <div
          className={clsx(
            "absolute flex items-center gap-2",
            type === "avatar" ? "-right-1 bottom-1" : "bottom-2 right-4"
          )}
        >
          <button
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full bg-violet-700 text-white",
              type === "avatar" ? "bottom-1 right-1" : "bottom-2 right-4"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            data-tooltip-place="bottom"
            data-tooltip-id="upload-button"
            data-tooltip-class-name="text-xs"
            data-tooltip-content={`Recommended: ${editorOptions.width}x${editorOptions.height}`}
          >
            <Upload className="size-4" />
          </button>
          <Tooltip id="upload-button" />
          <button
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full bg-violet-700 text-white",
              "hidden"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageChange(null);
              setImageFile(null);
            }}
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              setImageFile(file);
              setEditorOpen(true);
            }
          }}
        />
      </div>

      {editorOpen && (
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent
            className={clsx(
              "flex w-[90%] flex-col gap-4 !rounded-2xl bg-profile-modal-gradient p-5",
              type == "banner" ? "max-w-[900px]" : "max-w-[500px]"
            )}
            showCloseButton={false}
          >
            <div className="flex w-full flex-col items-center">
              <div className={clsx(type === "banner" && "aspect-[125/37] w-full")}>
                <AvatarEditor
                  ref={editorRef}
                  className="!h-full !w-full"
                  image={imageFile ?? ""}
                  width={editorOptions.width}
                  height={editorOptions.height}
                  border={50}
                  borderRadius={editorOptions.borderRadius}
                  scale={editorScale}
                />
              </div>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[editorScale]}
                onValueChange={(value) => setEditorScale(value[0])}
                className="mt-4 w-[200px]"
              />
              <Button className="mt-4 bg-violet-700 hover:bg-violet-600" onClick={handleSave}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ImageUpload;
