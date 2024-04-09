import clsx from "clsx";
import { useEffect, useState } from "react";
import ReactSlider from "react-slider";
import { Tooltip } from "react-tooltip";

import { LLMTokenCount } from "@/types";

const depthLabels: { [k: number]: string } = {
  0: "Depth 0: This Graph",
  1: "Depth 1: + Node Pages",
  2: "Depth 2: + Lv1 Graphs of Nodes",
  3: "Depth 3: + Lv1 Node Pages",
  4: "Depth 4: + Lv2 Graphs of Nodes",
  5: "Depth 5: + Lv2 Node Pages",
};

const Depth = ({
  depth,
  setDepth,
  tokenCount,
  className,
}: {
  depth: number;
  setDepth: React.Dispatch<React.SetStateAction<number>>;
  tokenCount: LLMTokenCount;
  className?: string;
}) => {
  const [cachedTokenCount, setCachedTokenCount] = useState<LLMTokenCount>({});

  useEffect(() => {
    if (Object.keys(tokenCount).length > 0) {
      setCachedTokenCount(tokenCount);
    }
  }, [tokenCount]);

  return (
    <div className={clsx("bg-gray-6 py-2 mb-1 mt-3 rounded", className)}>
      <div className="mx-2 flex items-center select-none">
        <div className="w-full h-3">
          <ReactSlider
            className="relative h-3"
            value={depth}
            marks
            min={0}
            max={5}
            onChange={(v) => setDepth(v)}
            renderMark={(props) => {
              const key = parseInt((props.key ?? 1).toString(), 10);
              return (
                <>
                  <div
                    {...props}
                    className={clsx("absolute size-3 rounded-full bg-violet-700", {
                      "!bg-white border border-violet-700": depth <= key - 1,
                      "grayscale opacity-85": !(key in cachedTokenCount),
                    })}
                    data-tooltip-id={`depth-slider-${key}`}
                    data-tooltip-place="top"
                  />
                  <Tooltip id={`depth-slider-${key}`}>{depthLabels[key]}</Tooltip>
                </>
              );
            }}
            renderTrack={(props) => {
              return (
                <div
                  {...props}
                  className={clsx("h-[2px] top-[5px] bg-white", {
                    "!bg-violet-700": props.key == "track-0",
                  })}
                />
              );
            }}
            renderThumb={(props, state) => (
              <>
                <div
                  {...props}
                  className="size-3"
                  data-tooltip-id="depth-slider-handle"
                  data-tooltip-place="top"
                >
                  <Tooltip id="depth-slider-handle">{depthLabels[state.valueNow]}</Tooltip>
                </div>
              </>
            )}
          />
        </div>
        <span className="text-neutral-500 font-bold text-xs ml-3 self-end">Depth</span>
      </div>
    </div>
  );
};

export default Depth;
