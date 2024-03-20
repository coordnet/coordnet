import clsx from "clsx";
import { useCombobox } from "downshift";
import { Search, View } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useFocus, useQuickView, useSpace } from "@/hooks";
import { GraphNode, Node } from "@/types";

type NodeProps = { className?: string };

const NodeRepository = ({ className }: NodeProps) => {
  const { space } = useSpace();
  const { isQuickViewOpen } = useQuickView();
  const {
    nodeRepositoryVisible: visible,
    setNodeRepositoryVisible: setVisible,
    reactFlowInstance,
    nodesMap,
    nodes,
    editor,
    focus,
  } = useFocus();

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key == "/" && event.metaKey && !isQuickViewOpen) {
        setVisible(!visible);
      }
      if (visible && event.key == "Escape") {
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

  function getNodesFilter(inputValue: string) {
    const lowerCasedInputValue = inputValue.toLowerCase();

    return function nodessFilter(node: Node) {
      return !inputValue || node.title.toLowerCase().includes(lowerCasedInputValue);
    };
  }

  const addNode = (node: Node) => {
    if (focus === "graph") {
      if (!reactFlowInstance) return alert("reactFlowInstance not found");
      if (!nodesMap) return alert("nodesMap not found");
      const flowPosition = reactFlowInstance.screenToFlowPosition({ x: 100, y: 100 });
      if (!flowPosition) alert("Failed to add node");
      const id = node.public_id;
      const newNode: GraphNode = {
        id,
        type: "GraphNode",
        position: flowPosition,
        style: { width: 200, height: 80 },
        data: {},
      };
      nodesMap.set(id, newNode);
    } else if (focus === "editor") {
      editor?.commands.insertContent(`<coord-node id="${node.public_id}"></coord-node><br/>`);
    } else {
      alert("Focus not found");
    }
  };

  const listNodes = useMemo<Node[]>(
    () =>
      (space?.nodes ?? []).filter(
        (node) =>
          !nodes.map((n) => n.id).includes(node.public_id) &&
          node.public_id !== space?.default_node_id,
      ),
    [space, nodes],
  );

  const Combobox = () => {
    const { showQuickView } = useQuickView();
    const [items, setItems] = useState<Node[]>(listNodes);

    const { getMenuProps, getInputProps, highlightedIndex, getItemProps, selectedItem } =
      useCombobox({
        onSelectedItemChange({ selectedItem }) {
          if (selectedItem) addNode(selectedItem);
        },
        onInputValueChange({ inputValue }) {
          if (inputValue == "" || !inputValue) {
            setItems([]);
          } else {
            setItems(listNodes.filter(getNodesFilter(inputValue)));
          }
        },
        items,
        stateReducer: (state, actionAndChanges) => {
          const { changes, type } = actionAndChanges;
          switch (type) {
            case useCombobox.stateChangeTypes.InputKeyDownEscape:
              return { ...changes, inputValue: state.inputValue };
            case useCombobox.stateChangeTypes.InputKeyDownEnter:
              return { ...changes, inputValue: state.inputValue };
            case useCombobox.stateChangeTypes.ItemClick:
              return { ...changes, inputValue: state.inputValue };
            case useCombobox.stateChangeTypes.InputBlur:
              return changes;
            default:
              return changes;
          }
        },
        itemToString(item) {
          return item ? item.title : "";
        },
      });

    return (
      <div
        className={clsx("absolute top-0 left-0 h-dvh w-dvw z-50", className)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            setVisible(false);
          }
        }}
      >
        <div className="m-auto flex flex-col w-[600px] mt-16 shadow rounded-lg bg-white p-4 pointer-events-auto">
          <div className="flex items-center gap-4">
            <Search className="size-4" />
            <input
              placeholder="Node title"
              className="w-full text-base focus:outline-none"
              autoFocus
              {...getInputProps()}
            />
          </div>
          <ul
            className={clsx("mt-4 max-h-[250px] overflow-y-scroll", {
              hidden: !items.length,
            })}
            {...getMenuProps()}
          >
            {items.map((item, index) => (
              <li
                className={clsx(
                  highlightedIndex === index && "bg-bg",
                  selectedItem === item && "font-bold",
                  "text-sm p-1 rounded flex items-center",
                )}
                key={item.public_id}
                {...getItemProps({ item, index })}
              >
                <div className="flex flex-col cursor-pointer">
                  <span>{item.title.replace(/(<([^>]+)>)/gi, "")}</span>
                  <span className="text-xs text-gray-4">
                    Tokens: {(item.title_token_count ?? 0) + (item.text_token_count ?? 0)}
                  </span>
                </div>
                <button
                  className="size-6 ml-auto flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    showQuickView(item.public_id);
                  }}
                >
                  <View strokeWidth={2.75} className="size-4 text-gray-4 font-bold ml-auto" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  if (visible && !isQuickViewOpen) return <Combobox />;
};

export default NodeRepository;
