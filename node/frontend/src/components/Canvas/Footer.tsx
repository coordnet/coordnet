import clsx from "clsx";
import { FileText, Share2 } from "lucide-react";
import { CSSProperties } from "react";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { useCanvas, useQuickView } from "@/hooks";

const Footer = ({
  id,
  nodeStyle,
  className,
}: {
  id: string;
  nodeStyle: CSSProperties;
  className?: string;
}) => {
  const { nodeFeatures } = useCanvas();
  const { showQuickView } = useQuickView();

  const { hasPage, hasCanvas, tokens } = nodeFeatures(id);

  // const backendNode = parent.data?.subnodes.find((node) => node.id === id);

  // const tokens = (backendNode?.text_token_count ?? 0) + (backendNode?.title_token_count ?? 0);

  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  // TODO: Make this work again
  // if (!backendNode || parent.type == BackendEntityType.SKILL) return <></>;

  return (
    <div className={clsx(className)}>
      {tokens > 0 && (
        <div
          className="absolute -bottom-4 left-0 flex h-4 items-center px-1 py-2 text-[10px]
            text-gray-4"
        >
          {tokens} token{tokens > 1 ? "s" : ""}
        </div>
      )}
      <div className="absolute bottom-[-7px] right-2 flex gap-1">
        {hasPage && (
          <>
            <div
              className={clsx(
                "flex size-4 items-center justify-center rounded border border-gray-1 bg-white",
                "nodrag cursor-pointer"
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
        {hasCanvas && (
          <>
            <div
              className={clsx(
                "flex size-4 items-center justify-center rounded border border-gray-1 bg-white",
                "nodrag cursor-pointer"
              )}
              style={{ borderColor: nodeStyle.borderColor }}
              data-tooltip-id="footer-canvas"
              data-tooltip-place="bottom"
              onClick={() => showQuickView(id)}
            >
              <Share2 className="size-2.5 rotate-90 text-gray-1" />
            </div>
            <Tooltip id="footer-canvas">Canvas</Tooltip>
          </>
        )}
      </div>
    </div>
  );
};

export default Footer;
