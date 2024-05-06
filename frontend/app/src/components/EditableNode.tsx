import clsx from "clsx";
import { FocusEventHandler, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";

import useSpace from "@/hooks/useSpace";

interface EditableNodeProps {
  id: string;
  contentEditable?: boolean;
  className?: string;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  onBlur?: FocusEventHandler<HTMLDivElement>;
}

const EditableNode = forwardRef<HTMLDivElement, EditableNodeProps>(
  ({ id, contentEditable = true, className = "", onFocus, onBlur, ...props }, ref) => {
    const { nodes, nodesMap, scope } = useSpace();
    const [isFocused, setIsFocused] = useState<boolean>(false);

    const inputRef = useRef<HTMLDivElement>(null);

    const node = nodes?.find((n) => n.id === id);

    useEffect(() => {
      if (!inputRef.current || isFocused) return;
      inputRef.current.innerHTML = node?.title ?? "";
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputRef, node]);

    useEffect(() => {
      const node = nodes?.find((n) => n.id === id);
      if (node?.title === inputRef.current?.innerHTML || !inputRef.current) return;
      inputRef.current.innerHTML = node?.title ?? "";
    }, [inputRef, nodes, id]);

    const onInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        nodesMap?.set(id, { id: id, title: e.currentTarget.innerHTML });
      },
      [nodesMap, id],
    );

    return (
      <div
        ref={mergeRefs([inputRef, ref])}
        contentEditable={scope == "read-write" && contentEditable}
        onInput={onInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        className={clsx("outline-none", className)}
        {...props}
        onFocus={(e) => {
          typeof onFocus === "function" && onFocus(e);
          setIsFocused(true);
        }}
        onBlur={(e) => {
          typeof onBlur === "function" && onBlur(e);
          setIsFocused(false);
        }}
      ></div>
    );
  },
);

export default EditableNode;
