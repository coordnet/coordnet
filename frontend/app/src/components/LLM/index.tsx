import { useQuery } from "@tanstack/react-query";
import { Editor, EditorContent, generateJSON } from "@tiptap/react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { Bot, GripIcon, Plus, SendHorizonal, Settings2, StopCircle, X } from "lucide-react";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Tooltip } from "react-tooltip";
import useLocalStorageState from "use-local-storage-state";
import { useDebounceValue } from "usehooks-ts";
import { v4 as uuid } from "uuid";

import { getLLMResponse, getLLMTokenCount } from "@/api";
import { useFocus, useSpace } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { GraphNode } from "@/types";
import { setNodePageContent } from "@/utils";

import { loadExtensions } from "../Editor/extensions";
import { Button } from "../ui/button";
import Buddies from "./Buddies";
import Depth from "./Depth";
import usePosition from "./usePosition";

const extensions = loadExtensions(undefined, undefined, true);
const readOnlyEditor = new Editor({
  editable: false,
  extensions,
  editorProps: { attributes: { class: "prose focus:outline-none" } },
});

const WIDTH = 600;

const LLM = ({ id }: { id: string }) => {
  const { nodesMap: spaceNodesMap } = useSpace();
  const { buddy, buddyId } = useBuddy();
  const { position, dragItem, handleDragStart } = usePosition(WIDTH);
  const { reactFlowInstance, nodesMap, editor, focus } = useFocus();

  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasResponse, setHasResponse] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [debouncedInput] = useDebounceValue(input, 500);
  const [abortController, setAbortController] = useState(new AbortController());
  const [response, setResponse] = useState<string>("");
  const [llmSettingsOpen, setLlmSettingsOpen] = useLocalStorageState<boolean>(
    `coordnet:llmSettingsOpen`,
    { defaultValue: false },
  );
  const [depth, setDepth] = useLocalStorageState<number>(`coordnet:llmDepth`, {
    defaultValue: 2,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: tokenCount, isLoading: isTokenCountLoading } = useQuery({
    queryKey: ["token_count", buddyId, debouncedInput, id, depth],
    queryFn: ({ signal }) => getLLMTokenCount(buddyId, debouncedInput, id, depth, signal),
    enabled: Boolean(buddyId && id),
    initialData: {},
  });

  const onSubmit = async (promptInput: string = input) => {
    setLoading(true);
    setResponse("&hellip;");
    setHasResponse(true);

    if (abortController) abortController.abort();
    const newAbortController = new AbortController();
    setAbortController(newAbortController);
    const stream = getLLMResponse(newAbortController, buddyId, promptInput, id, depth);
    let string = "";
    stream.on("data", async (data: string) => {
      string += data;
      const sanitizedResponse = DOMPurify.sanitize(await marked.parse(string));
      setResponse(sanitizedResponse);
      const elem = scrollRef?.current;
      if (elem) elem.scrollTop = elem?.scrollHeight;
    });
    stream.on("end", () => setLoading(false));
    stream.on("error", (error: Error) => {
      setLoading(false);
      console.error("Stream error", error);
      // handleApiError(error);
    });
  };

  const addNode = () => {
    if (focus === "graph") {
      if (!reactFlowInstance) return alert("reactFlowInstance not found");
      if (!nodesMap) return alert("nodesMap not found");
      const flowPosition = reactFlowInstance.screenToFlowPosition({ x: 100, y: 100 });
      if (!flowPosition) alert("Failed to add node");
      const id = uuid();
      const newNode: GraphNode = {
        id,
        type: "GraphNode",
        position: flowPosition,
        style: { width: 200, height: 80 },
        data: {},
      };
      spaceNodesMap?.set(id, { id: id, title: "New node" });
      nodesMap.set(id, newNode);
      const responseJson = generateJSON(response, extensions);
      setNodePageContent(responseJson, `node-editor-${id}`, readOnlyEditor.schema);
    } else if (focus === "editor") {
      editor?.commands.insertContent(response);
    } else {
      alert("Focus not found");
    }
  };

  useEffect(() => {
    readOnlyEditor?.commands.setContent(response);
  }, [response]);

  if (!isOpen)
    return (
      <div className="absolute z-60 bottom-2 left-1/2 -translate-x-1/2" tabIndex={0}>
        <Button
          variant="outline"
          className="pr-1"
          onClick={(e) => {
            setIsOpen(true);
            e.stopPropagation();
          }}
        >
          Message AI
          <div className="size-7 bg-bg flex items-center justify-center rounded ml-3 ">
            <SendHorizonal className="size-4 text-lilac" strokeWidth={3} />
          </div>
        </Button>
      </div>
    );

  return (
    <div
      className="absolute z-60 bottom-0"
      style={{ left: `${position}%` }}
      ref={dragItem}
      tabIndex={0}
    >
      <div className="bg-bg py-2 px-3 rounded-t-lg rounded-r-lg" style={{ width: WIDTH }}>
        <div
          className="absolute top-2 left-2 cursor-grab select-none"
          onMouseDown={handleDragStart}
        >
          <GripIcon className="size-4 text-gray-4" />
        </div>
        <div className="absolute top-2 right-2 cursor-pointer" onClick={() => setIsOpen(false)}>
          <X className="size-4 text-gray-4" />
        </div>
        {hasResponse && (
          <div className="p-1 mt-5 mb-2">
            <div className="leading-6 pb-3 max-h-96 overflow-auto -mt-2" ref={scrollRef}>
              <EditorContent editor={readOnlyEditor} />
            </div>
            {loading ? (
              <Button variant="outline" onClick={() => abortController?.abort()}>
                <StopCircle className="size-4 mr-2" /> Stop
              </Button>
            ) : (
              <Button variant="outline" onClick={() => addNode()}>
                <Plus className="size-4 mr-1" /> Add to {focus === "graph" ? "Graph" : "Editor"}
              </Button>
            )}
          </div>
        )}
        <div className="flex px-1">
          <div className="grow">
            <div className={clsx("text-xs text-gray-3 h-5 mb-1", !hasResponse && "pl-3")}>
              {isTokenCountLoading || Object.keys(tokenCount).length === 0
                ? "Counting..."
                : `${tokenCount?.[depth]?.toLocaleString()} Tokens`}
            </div>
            <div className="rounded border border-gray-6 bg-white p-1 flex items-center shadow-md">
              <TextareaAutosize
                onChange={(e) => setInput(e.target?.value)}
                onKeyDown={(e) => {
                  if (e.key == "Enter" && e.shiftKey == false) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                className="bg-transparent text-sm text-gray-1 placeholder:text-gray-4 px-2 focus:outline-none grow resize-none border-0"
                placeholder="Send a message"
                value={input}
                maxRows={7}
              />
              <Button
                variant="secondary"
                className="size-7 bg-bg text-lilac p-0"
                disabled={input.length == 0}
                onClick={() => onSubmit()}
              >
                <SendHorizonal strokeWidth={3} className="size-4" />
              </Button>
            </div>
            {llmSettingsOpen && <Depth depth={depth} setDepth={setDepth} />}
          </div>
          <div className="ml-3">
            <div
              className={clsx(
                "text-xs text-gray-3 h-5 flex items-center max-w-[125px] mb-1",
                !hasResponse && "pr-3",
              )}
            >
              <Bot className="size-3 mr-1 shrink-0" />
              <div className="line-clamp-1">{buddy?.name ?? "No Buddy"}</div>
            </div>
            <div className="flex gap-3">
              <Buddies />
              <Button
                className={clsx("size-9 p-0 shadow-md", llmSettingsOpen && "border-lilac")}
                variant="outline"
                data-tooltip-id="llm-settings"
                onClick={() => setLlmSettingsOpen(!llmSettingsOpen)}
              >
                <Settings2 className="size-4" />
              </Button>
              <Tooltip id="llm-settings" openEvents={{ mouseenter: true }}>
                Settings
              </Tooltip>
              {/* <History /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLM;
