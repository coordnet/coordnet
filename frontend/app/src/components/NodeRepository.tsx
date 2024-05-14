import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { Ellipsis, Loader2, Plus, RefreshCcw, Search, View } from "lucide-react";
import numeral from "numeral";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSpaces, searchNodes } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFocus, useQuickView, useSpace } from "@/hooks";
import { GraphNode, NodeSearchResult } from "@/types";

import { addNodeToGraph } from "./Graph/utils";
import { Button } from "./ui/button";

type NodeProps = { className?: string };

const NodeRepository = ({ className }: NodeProps) => {
  const { space, nodesMap: spaceNodesMap } = useSpace();
  const { isQuickViewOpen, showQuickView } = useQuickView();
  const navigate = useNavigate();
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
  });

  const {
    nodeRepositoryVisible: visible,
    setNodeRepositoryVisible: setVisible,
    reactFlowInstance,
    nodesMap,
    editor,
    focus,
  } = useFocus();

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "/" && event.metaKey && !isQuickViewOpen) {
        setVisible(!visible);
      }
      if (visible && event.key === "Escape") {
        event.preventDefault();
        setVisible(false);
      }
    },
    [visible, setVisible, isQuickViewOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  const addNode = (node: NodeSearchResult) => {
    if (focus === "graph") {
      if (!reactFlowInstance) return alert("reactFlowInstance not found");
      if (!nodesMap) return alert("nodesMap not found");
      const flowPosition = reactFlowInstance.screenToFlowPosition({ x: 100, y: 100 });
      if (!flowPosition) alert("Failed to add node");
      const id = node.id;
      const newNode: GraphNode = {
        id,
        type: "GraphNode",
        position: flowPosition,
        style: { width: 200, height: 80 },
        data: {},
      };
      nodesMap.set(id, newNode);
    } else if (focus === "editor") {
      editor?.commands.insertContent(`<coord-node id="${node.id}"></coord-node>`);
    } else {
      alert("Focus not found");
    }
  };

  const addNewNode = (text: string) => {
    if (focus === "graph") {
      if (!reactFlowInstance) return alert("reactFlowInstance not found");
      if (!nodesMap || !spaceNodesMap) return alert("nodesMap not found");
      addNodeToGraph(reactFlowInstance, nodesMap, spaceNodesMap, text, undefined, {
        x: 100,
        y: 100,
      });
    }
  };

  const [inputValue, setInputValue] = useState<string>("");
  const { data, isLoading } = useQuery({
    queryKey: ["searchNodes", inputValue],
    queryFn: ({ signal }) => searchNodes(signal, inputValue, space?.id ?? ""),
    enabled: Boolean(inputValue && space),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (nodeListRef.current) nodeListRef.current.scrollTop = 0;
    setSelectedIndex(0);
    setInputValue(e.target.value);
  };

  const results = data?.results ?? [];
  const nodeListRef = useRef<HTMLUListElement>(null);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const createNodeSelected = selectedIndex === results.length;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (results.length + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (results.length + 1)) % (results.length + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (createNodeSelected) {
          addNewNode(inputValue);
        } else {
          addNode(results[selectedIndex]);
        }
      }
    },
    [results, selectedIndex, createNodeSelected, inputValue],
  );

  useEffect(() => {
    if (nodeListRef.current && selectedIndex >= 0) {
      const selectedItem = nodeListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "start", inline: "nearest" });
      }
    }
  }, [selectedIndex]);

  return visible && !isQuickViewOpen ? (
    <div
      className={clsx("absolute top-0 left-0 h-dvh w-dvw z-60", className)}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          setVisible(false);
        }
      }}
    >
      <div className="m-auto flex flex-col w-[600px] mt-16 rounded-md border border-neutral-200 shadow-node-repo bg-white pointer-events-auto">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-b-neutral-100">
          <Search className="size-4 text-neutral-400/50" strokeWidth={3} />
          <input
            placeholder="Search Content"
            className="w-full text-base font-medium focus:outline-none px-0 placeholder:text-neutral-400/50"
            autoFocus
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          {/* <Button variant="ghost" className="p-0 h-auto">
            <Settings2 className="size-4 text-neutral-500" strokeWidth={3} />
          </Button> */}
        </div>
        <ul
          ref={nodeListRef}
          className={clsx("px-2 py-1.5 max-h-[250px] overflow-y-scroll", {
            hidden: !results.length,
          })}
        >
          <div className="px-2 py-1.5 text-sm font-semibold">Nodes</div>
          {results.map((item, index) => (
            <li
              className={clsx(
                "text-sm px-2 py-1.5 rounded flex items-start",
                "hover:bg-neutral-100",
                { "bg-neutral-100": index === selectedIndex },
              )}
              key={item.id + index}
            >
              <div className="flex flex-col mr-2">
                <div className="cursor-pointer" onClick={() => addNode(item)}>
                  {DOMPurify.sanitize(item.title ?? "", { ALLOWED_TAGS: [] })}
                </div>
                <div className="flex gap-1 text-xs text-neutral-400 font-medium">
                  {!spacesLoading && (
                    <>
                      <span>
                        {spaces?.results.find((space) => space.id == item.spaces[0])?.title}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>
                    {numeral((item.title_token_count ?? 0) + (item.text_token_count ?? 0)).format(
                      "0a",
                    )}{" "}
                    token
                    {(item.title_token_count ?? 0) + (item.text_token_count ?? 0) > 1 ? "s" : ""}
                  </span>
                  {Boolean(item?.parents.length > 0) && (
                    <>
                      <span>·</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <span className="flex items-center underline cursor-pointer">
                            <RefreshCcw className="size-2.5" />
                            {item?.parents.length}
                          </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-70 w-[200px]" align="start">
                          <DropdownMenuLabel>Canvases</DropdownMenuLabel>
                          {item?.parents.map((parent, i) => {
                            if (!spaceNodesMap?.get(parent)?.title) return null;
                            return (
                              <DropdownMenuItem
                                key={`${item?.id}-${i}`}
                                className="flex items-center cursor-pointer"
                                onClick={() => {
                                  navigate(`/spaces/${space?.id}/${parent}`);
                                  setVisible(false);
                                }}
                              >
                                {DOMPurify.sanitize(spaceNodesMap?.get(parent)?.title ?? "", {
                                  ALLOWED_TAGS: [],
                                })}

                                <Button
                                  variant="ghost"
                                  className="p-0 h-auto flex items-center ml-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showQuickView(parent);
                                  }}
                                >
                                  <View className="size-4 text-neutral-600" />
                                </Button>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}

                  <span>·</span>
                  <span>Edited: {format(new Date(item.updated_at), "dd MMM, HH:mm")}</span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="p-0 h-auto flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    showQuickView(item.id);
                  }}
                >
                  <View className="size-4 text-neutral-600" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0 h-auto flex items-center">
                      <Ellipsis className="size-4 text-neutral-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-70 w-[200px]" align="start">
                    <DropdownMenuItem
                      className="font-normal flex items-center cursor-pointer"
                      onClick={() => addNode(item)}
                    >
                      <Plus className="size-3 mr-1" /> Add to Canvas
                      <div className="ml-auto text-xs text-neutral-500">⏎</div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
        {isLoading && (
          <div className="px-4 py-3 flex items-center justify-center">
            Loading <Loader2 className="animate-spin size-3 ml-2" />
          </div>
        )}
        {Boolean(!isLoading && results?.length == 0 && inputValue.length) && (
          <div className="px-4 py-3 flex items-center justify-center">No results</div>
        )}
        {Boolean(inputValue.length) && (
          <div
            className={clsx(
              "px-2 py-1.5 text-neutral-700 font-medium cursor-pointer",
              "border-t border-t-neutral-100 px-2 py-1.5 flex items-center",
              "hover:bg-neutral-100",
              { "bg-neutral-100": createNodeSelected },
            )}
            onClick={() => addNewNode(inputValue)}
          >
            <Plus className="size-4 mr-2" strokeWidth={2.5} /> Create {inputValue}
          </div>
        )}
      </div>
    </div>
  ) : null;
};

export default NodeRepository;
