import clsx from "clsx";
import DOMPurify from "dompurify";
import { FocusEventHandler, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";

import { ALLOWED_TAGS, FORBID_ATTR } from "@/constants";
import { useNodesContext } from "@/hooks";

interface EditableNodeProps {
  id: string;
  contentEditable?: boolean;
  className?: string;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  onBlur?: FocusEventHandler<HTMLDivElement>;
}

const EditableNode = forwardRef<HTMLDivElement, EditableNodeProps>(
  ({ id, contentEditable = true, className = "", onFocus, onBlur, ...props }, ref) => {
    const { nodes, nodesMap, scope } = useNodesContext();
    const [isFocused, setIsFocused] = useState<boolean>(false);

    const inputRef = useRef<HTMLDivElement>(null);

    const node = nodes?.find((n) => n.id === id);

    useEffect(() => {
      if (!inputRef.current || isFocused) return;
      const cleaned = DOMPurify.sanitize(node?.title ?? "", { ALLOWED_TAGS, FORBID_ATTR });
      inputRef.current.innerHTML = cleaned;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputRef, node]);

    useEffect(() => {
      const node = nodes?.find((n) => n.id === id);
      if (node?.title === inputRef.current?.innerHTML || !inputRef.current) return;
      const cleaned = DOMPurify.sanitize(node?.title ?? "", { ALLOWED_TAGS, FORBID_ATTR });
      inputRef.current.innerHTML = cleaned;
    }, [inputRef, nodes, id]);

    const onInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const cleaned = DOMPurify.sanitize(e.currentTarget.innerHTML, {
          ALLOWED_TAGS,
          FORBID_ATTR,
        });
        nodesMap?.set(id, { id: id, title: cleaned });
      },
      [nodesMap, id]
    );

    function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
      e.stopPropagation();
      e.preventDefault();

      // @ts-expect-error window.clipboardData is a fallback for older browser
      const clipboardData = e.clipboardData || window.clipboardData;
      const pastedHtml = clipboardData.getData("text/html");
      if (pastedHtml) {
        const cleaned = DOMPurify.sanitize(pastedHtml, { ALLOWED_TAGS, FORBID_ATTR });

        // Insert the cleaned HTML at the cursor position
        document.execCommand("insertHTML", false, cleaned);
      } else {
        const pastedText = clipboardData.getData("text/plain");
        document.execCommand("insertText", false, pastedText);
      }

      // Update the nodesMap with the new content
      if (inputRef.current) {
        const updatedContent = inputRef.current.innerHTML;
        nodesMap?.set(id, { id: id, title: updatedContent });
      }
    }

    return (
      <div
        ref={mergeRefs([inputRef, ref])}
        contentEditable={scope == "read-write" && contentEditable}
        onInput={onInput}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        className={clsx("outline-none", className)}
        {...props}
        onFocus={(e) => {
          if (typeof onFocus === "function") onFocus(e);
          setIsFocused(true);
        }}
        onBlur={(e) => {
          if (typeof onBlur === "function") onBlur(e);
          setIsFocused(false);
        }}
      ></div>
    );
  }
);

EditableNode.displayName = "EditableNode";

export default EditableNode;
