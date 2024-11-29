import clsx from "clsx";
import { Upload, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import AvatarEditor from "react-avatar-editor";
import { useDropzone } from "react-dropzone";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Button } from "../ui/button";
import { Slider } from "../ui/slider";

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
  fileInputRef: React.RefObject<HTMLInputElement>;
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
          className,
        )}
        style={{ backgroundImage: `url("${image}")` }}
      >
        {isDragging && (
          <div
            className={clsx(
              "absolute w-full h-full text-xs bg-gray-200 text-gray-4 font-medium flex items-center justify-center text-center",
              type == "avatar" ? "rounded-full" : "rounded-lg",
            )}
          >
            Drop here
            <Upload className="ml-2 size-3" />
          </div>
        )}
        {type == "banner" && !image && (
          <div className="text-neutral-800 text-sm font-medium font-['Roboto'] leading-tight">
            Banner Image
          </div>
        )}
        <input {...getInputProps()} />
        <div
          className={clsx(
            "absolute flex items-center gap-2",
            type === "avatar" ? "bottom-1 -right-1" : "right-4 bottom-2",
          )}
        >
          <button
            className={clsx(
              "w-8 h-8 bg-violet-700 rounded-full flex justify-center items-center text-white ",
              type === "avatar" ? "bottom-1 right-1" : "right-4 bottom-2",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <Upload className="size-4" />
          </button>
          <button
            className={clsx(
              "w-8 h-8 bg-violet-700 rounded-full flex justify-center items-center text-white ",
              "hidden",
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
              "bg-profile-modal-gradient p-5 w-[90%] !rounded-2xl flex flex-col gap-4",
              type == "banner" ? "max-w-[900px]" : "max-w-[500px]",
            )}
            showCloseButton={false}
          >
            <div className="flex flex-col items-center w-full">
              <div className={clsx(type === "banner" && "aspect-[125/37] w-full")}>
                <AvatarEditor
                  ref={editorRef}
                  className="!w-full !h-full"
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
                className="w-[200px] mt-4"
              />
              <Button className="bg-violet-700 hover:bg-violet-600 mt-4" onClick={handleSave}>
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
