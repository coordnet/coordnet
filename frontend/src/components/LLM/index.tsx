import { useQuery } from "@tanstack/react-query";
import { EditorContent } from "@tiptap/react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { Bot, GripIcon, Plus, SendHorizonal, Settings2, StopCircle, X } from "lucide-react";
import { marked } from "marked";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";
import store from "store2";
import useLocalStorageState from "use-local-storage-state";
import { useDebounceValue } from "usehooks-ts";

import { getLLMTokenCount } from "@/api";
import { websocketUrl } from "@/constants";
import { useFocus, useNodesContext } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import useUser from "@/hooks/useUser";
import { readOnlyEditor } from "@/lib/readOnlyEditor";
import { LLMTokenCount } from "@/types";

import { addNodeToGraph } from "../Graph/utils";
import { Button } from "../ui/button";
import Buddies from "./Buddies";
import Depth from "./Depth";
import usePosition from "./usePosition";

const WIDTH = 600;

const getTokenCountForDepth = (tokenCount: LLMTokenCount, depth: string | number): string => {
  if (depth in tokenCount) {
    return tokenCount[depth.toString()].toLocaleString();
  }

  const depths = Object.keys(tokenCount)
    .map(Number)
    .sort((a, b) => a - b);
  const lastAvailableDepth = depths[depths.length - 1];

  return lastAvailableDepth !== undefined
    ? tokenCount[lastAvailableDepth.toString()].toLocaleString()
    : "Unknown";
};

const LLM = ({ id }: { id: string }) => {
  const { nodesMap: spaceNodesMap } = useNodesContext();
  const { buddy, buddyId } = useBuddy();
  const { isGuest } = useUser();
  const { position, dragItem, handleDragStart } = usePosition(WIDTH);
  const { reactFlowInstance, nodesMap, editor, focus, nodes } = useFocus();

  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasResponse, setHasResponse] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [debouncedInput] = useDebounceValue(input, 500);
  const [abortController, setAbortController] = useState(new AbortController());
  const [response, setResponse] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [llmSettingsOpen, setLlmSettingsOpen] = useLocalStorageState<boolean>(
    `coordnet:llmSettingsOpen`,
    { defaultValue: false }
  );
  const [depth, setDepth] = useLocalStorageState<number>(`coordnet:llmDepth`, {
    defaultValue: 2,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const autoScrollToBottom = () => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight - element.clientHeight;
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const threshold = 100;
    const userScrolledUp =
      element.scrollHeight - element.scrollTop - element.clientHeight > threshold;
    setAutoScroll(!userScrolledUp);
  };

  useEffect(() => {
    if (autoScroll) {
      autoScrollToBottom();
    }
  }, [response]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);

      return () => {
        element.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  const queryNodes = useMemo(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    return selectedNodes.length ? selectedNodes.map((node) => node.id).filter((id) => id) : [id];
  }, [id, nodes]);

  const { data: tokenCount, isLoading: isTokenCountLoading } = useQuery({
    queryKey: ["token_count", buddyId, debouncedInput, queryNodes, depth],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      getLLMTokenCount(buddyId, debouncedInput, queryNodes, depth, signal),
    enabled: Boolean(buddyId && id),
    initialData: {},
  });

  const onSubmit = async (promptInput: string = input) => {
    setLoading(true);
    setResponse("Loading...");
    setHasResponse(true);

    if (abortController) abortController.abort();
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    const socket = new WebSocket(`${websocketUrl}/buddies/${buddyId}/`);
    socket.onopen = () => {
      const payload = JSON.stringify({
        message: promptInput,
        nodes: queryNodes,
        level: depth,
        token: store("coordnet-auth"),
      });
      socket.send(payload);
    };

    let string = "";
    socket.onmessage = async (event) => {
      string += event.data;
      const sanitizedResponse = DOMPurify.sanitize(await marked.parse(string));
      setResponse(sanitizedResponse);
    };

    socket.onerror = (error) => {
      setLoading(false);
      console.error("Websocket error", error);
      toast.error("Error from websocket");
    };

    socket.onclose = () => {
      setLoading(false);
    };

    // Close socket if aborted
    newAbortController.signal.addEventListener("abort", () => {
      socket.close();
    });
  };

  const addNode = () => {
    if (focus === "graph") {
      if (!reactFlowInstance) return alert("reactFlowInstance not found");
      if (!nodesMap) return alert("nodesMap not found");
      if (!spaceNodesMap) return alert("spaceNodesMap not found");
      const position = reactFlowInstance.screenToFlowPosition({ x: 200, y: 100 });
      addNodeToGraph(nodesMap, spaceNodesMap, "New node", position, response);
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
      <div className="absolute bottom-2 left-1/2 z-60 -translate-x-1/2" tabIndex={0}>
        <Button
          variant="outline"
          className="h-9 pl-2 pr-[3px]"
          onClick={(e) => {
            setIsOpen(true);
            e.stopPropagation();
          }}
        >
          Message AI
          <div className="ml-3 flex size-7 items-center justify-center rounded bg-bg">
            <SendHorizonal className="size-4 text-lilac" strokeWidth={3} />
          </div>
        </Button>
      </div>
    );

  return (
    <div
      className="absolute bottom-0 z-60"
      style={{ left: `${position}%` }}
      ref={dragItem}
      tabIndex={0}
    >
      <div className="rounded-r-lg rounded-t-lg bg-bg px-3 py-2" style={{ width: WIDTH }}>
        <div
          className="absolute left-2 top-2 cursor-grab select-none"
          onMouseDown={handleDragStart}
        >
          <GripIcon className="size-4 text-gray-4" />
        </div>
        <div className="absolute right-2 top-2 cursor-pointer" onClick={() => setIsOpen(false)}>
          <X className="size-4 text-gray-4" />
        </div>
        {hasResponse && (
          <div className="mb-2 mt-5 p-1">
            {response === "Loading..." ? (
              <div className="px-2 pb-4 pt-0 text-sm">
                <div className="flex items-center">
                  Loading
                  <div
                    className="ml-3 size-3 animate-spin rounded-full border-b-2 border-t-2
                      border-blue-500"
                  ></div>
                </div>
                {buddy?.model == "o1-preview" && (
                  <div className="mt-2 text-sm italic text-gray-3">
                    (o1 currently can&apos;t stream responses so it may take a moment to appear)
                  </div>
                )}
              </div>
            ) : (
              <div className="-mt-2 max-h-96 overflow-auto pb-3 leading-6" ref={scrollRef}>
                <EditorContent editor={readOnlyEditor} />
              </div>
            )}
            {loading ? (
              <Button variant="outline" onClick={() => abortController?.abort()}>
                <StopCircle className="mr-2 size-4" /> Stop
              </Button>
            ) : !isGuest ? (
              <Button variant="outline" onClick={() => addNode()}>
                <Plus className="mr-1 size-4" /> Add to {focus === "graph" ? "Graph" : "Editor"}
              </Button>
            ) : (
              <></>
            )}
          </div>
        )}
        <div className="flex px-1">
          <div className="grow">
            <div className={clsx("mb-1 h-5 text-xs text-gray-3", !hasResponse && "pl-3")}>
              {isTokenCountLoading || Object.keys(tokenCount).length === 0
                ? "Counting..."
                : `${getTokenCountForDepth(tokenCount, depth)} Tokens`}
            </div>
            <div className="flex items-center rounded border border-gray-6 bg-white p-1 shadow-md">
              <TextareaAutosize
                autoFocus
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target?.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key == "Enter" && e.shiftKey == false) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                className="grow resize-none border-0 bg-transparent px-2 text-sm text-gray-1
                  placeholder:text-gray-4 focus:outline-none"
                placeholder="Send a message"
                value={input}
                maxRows={7}
              />
              <Button
                variant="secondary"
                className="mt-auto size-7 bg-bg p-0 text-lilac"
                disabled={input.length == 0}
                onClick={() => onSubmit()}
              >
                <SendHorizonal strokeWidth={3} className="size-4" />
              </Button>
            </div>
            {llmSettingsOpen && <Depth depth={depth} tokenCount={tokenCount} setDepth={setDepth} />}
          </div>
          <div className={clsx("ml-3 flex flex-col", llmSettingsOpen && "mb-12")}>
            <div
              className={clsx(
                "mb-1 flex h-5 max-w-[125px] items-center text-xs text-gray-3",
                !hasResponse && "pr-3"
              )}
            >
              <Bot className="mr-1 size-3 shrink-0" />
              <div className="line-clamp-1">{buddy?.name ?? "No Buddy"}</div>
            </div>
            <div className="mt-auto flex gap-3">
              <Buddies className="mt-auto" />
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
