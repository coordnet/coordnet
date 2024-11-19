import clsx from "clsx";
import { FileText, Share2 } from "lucide-react";
import { CSSProperties } from "react";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { useNode, useQuickView } from "@/hooks";

const Footer = ({
  id,
  nodeStyle,
  className,
}: {
  id: string;
  nodeStyle: CSSProperties;
  className?: string;
}) => {
  const { node } = useNode();
  const { showQuickView } = useQuickView();

  const backendNode = node?.subnodes.find((node) => node.id === id);

  const tokens = (backendNode?.text_token_count ?? 0) + (backendNode?.title_token_count ?? 0);

  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  if (!backendNode) return <></>;

  return (
    <div className={clsx(className)}>
      {tokens > 0 && (
        <div className="absolute h-4 flex items-center px-1 py-2 -bottom-4 left-0 text-[10px] text-gray-4">
          {tokens} token{tokens > 1 ? "s" : ""}
        </div>
      )}
      {Boolean(backendNode) && (
        <div className="absolute bottom-[-7px] right-2 flex gap-1">
          {Boolean(backendNode?.text_token_count) && (
            <>
              <div
                className={clsx(
                  "size-4 bg-white rounded border border-gray-1 flex items-center justify-center",
                  "cursor-pointer nodrag",
                )}
                style={{ borderColor: nodeStyle.borderColor }}
                data-tooltip-id="footer-node-page"
                data-tooltip-place="bottom"
                onClick={() => setNodePage(id)}
              >
                <FileText className="size-2.5 text-gray-1" />
              </div>
              <Tooltip id="footer-node-page">Node Page</Tooltip>
            </>
          )}
          {backendNode?.has_subnodes && (
            <>
              <div
                className={clsx(
                  "size-4 bg-white rounded border border-gray-1 flex items-center justify-center",
                  "cursor-pointer nodrag",
                )}
                style={{ borderColor: nodeStyle.borderColor }}
                data-tooltip-id="footer-graph"
                data-tooltip-place="bottom"
                onClick={() => showQuickView(id)}
              >
                <Share2 className="size-2.5 text-gray-1 rotate-90" />
              </div>
              <Tooltip id="footer-graph">Graph</Tooltip>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Footer;
