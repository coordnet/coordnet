import "./Editor/styles.css";

import { useEditor } from "@tiptap/react";
import clsx from "clsx";
import { ReactFlowProvider } from "reactflow";

import useNode from "@/hooks/useNode";
import { NodeProvider } from "@/hooks/useNode/provider";

import { Graph } from "./";
import Editor from "./Editor";
import { loadExtensions } from "./Editor/extensions";

type NodeProps = { id: string; title: string; className?: string };

const Node = ({ title, className }: NodeProps) => {
  const { connected, synced, editorYdoc, editorProvider } = useNode();

  const editor = useEditor({
    extensions: loadExtensions(editorProvider, editorYdoc),
  });

  if (!synced) return <div>Loading node...</div>;
  if (!connected) return <div>Obtaining connection to node...</div>;

  return (
    <div className={clsx("w-full", className)}>
      Node in space {title}
      <br />
      <div className="mt-5 font-bold">Editor:</div>
      {editor ? <Editor editor={editor} /> : <></>}
      <div className="mt-5 font-bold">Graph:</div>
      <div className="size-full h-96">
        <Graph />
      </div>
    </div>
  );
};

const NodeOuter = ({ id, ...props }: NodeProps) => {
  return (
    <NodeProvider id={id}>
      <ReactFlowProvider>
        <Node id={id} {...props} />
      </ReactFlowProvider>
    </NodeProvider>
  );
};

export default NodeOuter;
