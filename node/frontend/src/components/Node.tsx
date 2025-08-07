import "./Editor/styles.css";

import { useQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import clsx from "clsx";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";
import { useState } from "react";

import { getSpaceProfile } from "@/api";
import { useYDoc } from "@/hooks";
import useUser from "@/hooks/useUser";
import { BackendEntityType } from "@/types";

import { Canvas, Loader } from "./";
import ErrorPage from "./ErrorPage";
import { getProfileImage } from "./Profiles/utils";
import { Button } from "./ui/button";
import { AlignmentSettings } from "./Canvas/AlignmentSettings";
import { AutoAlignmentOptions } from "./Canvas/AutoAlignment";

type NodeProps = { id: string; className?: string };

const Node = ({ id, className }: NodeProps) => {
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();
  const { isGuest } = useUser();
  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  // Alignment settings state
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [showPixelDistances, setShowPixelDistances] = useState(true);
  const [autoAlignmentOptions, setAutoAlignmentOptions] = useState<AutoAlignmentOptions>({
    enabled: false,
    mode: "horizontal",
    spacing: 20,
    startPosition: { x: 100, y: 100 },
  });
  const [enableMultiSelect, setEnableMultiSelect] = useState(true);
  const [enableSmartSnapping, setEnableSmartSnapping] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [snapThreshold, setSnapThreshold] = useState(10);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [enableSmartGuides, setEnableSmartGuides] = useState(true);
  const [enableDistributionGuides, setEnableDistributionGuides] = useState(true);
  const [enableSpacingGuides, setEnableSpacingGuides] = useState(true);
  const [enableAdvancedAlignment, setEnableAdvancedAlignment] = useState(true);
  const [enableCenterSnapping, setEnableCenterSnapping] = useState(true);

  const { data: profile } = useQuery({
    queryKey: ["profile", parent?.id],
    queryFn: ({ signal }) => getSpaceProfile(signal, parent?.id ?? ""),
    enabled: !!parent?.id,
    retry: false,
  });

  if (error) return <ErrorPage error={error} />;
  if (!synced || parent.isLoading) return <Loader message="Loading canvas..." />;
  if (!connected) return <Loader message="Obtaining connection to canvas..." />;

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "absolute top-0 z-20 flex h-9 gap-2 leading-9",
          isGuest ? "left-2" : "left-24"
        )}
      >
        <Link
          to={`/profiles/${profile?.profile_slug}`}
          className="flex w-full items-center font-normal text-black hover:text-black"
        >
          <Button
            variant="outline"
            className="flex h-9 items-center rounded border border-neutral-200 bg-white px-3 text-sm
              font-medium text-neutral-900"
            data-tooltip-id="space-node-profile"
            data-tooltip-place="bottom"
            data-tooltip-content="Go to Space Profile"
            data-tooltip-class-name="text-xs py-1"
          >
            {/* <EditableNode id={id} /> */}
            {parent.type === BackendEntityType.SPACE && (
              <>
                <img src={getProfileImage(profile)} className="mr-2 size-4 rounded-full" />
                {parent.data?.title}
              </>
            )}
          </Button>
        </Link>
        <Tooltip id="space-node-profile" />
        <Button
          variant="outline"
          className="size-9 flex-shrink-0 p-0"
          onClick={() => setNodePage(nodePage == id ? "" : id)}
          data-tooltip-id="show-editor"
          data-tooltip-place="bottom"
        >
          <FileText strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="show-editor">Node Page</Tooltip>
        
        {/* Alignment Settings */}
        <AlignmentSettings
          autoAlignmentOptions={autoAlignmentOptions}
          onAutoAlignmentChange={setAutoAlignmentOptions}
          showAlignmentGuides={showAlignmentGuides}
          onShowAlignmentGuidesChange={setShowAlignmentGuides}
          showPixelDistances={showPixelDistances}
          onShowPixelDistancesChange={setShowPixelDistances}
          enableMultiSelect={enableMultiSelect}
          onEnableMultiSelectChange={setEnableMultiSelect}
          enableSmartSnapping={enableSmartSnapping}
          onEnableSmartSnappingChange={setEnableSmartSnapping}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
          snapThreshold={snapThreshold}
          onSnapThresholdChange={setSnapThreshold}
          showMeasurements={showMeasurements}
          onShowMeasurementsChange={setShowMeasurements}
          enableSmartGuides={enableSmartGuides}
          onEnableSmartGuidesChange={setEnableSmartGuides}
          enableDistributionGuides={enableDistributionGuides}
          onEnableDistributionGuidesChange={setEnableDistributionGuides}
          enableSpacingGuides={enableSpacingGuides}
          onEnableSpacingGuidesChange={setEnableSpacingGuides}
          enableAdvancedAlignment={enableAdvancedAlignment}
          onEnableAdvancedAlignmentChange={setEnableAdvancedAlignment}
          enableCenterSnapping={enableCenterSnapping}
          onEnableCenterSnappingChange={setEnableCenterSnapping}
        />
      </div>
      <Canvas
        showAlignmentGuides={showAlignmentGuides}
        showPixelDistances={showPixelDistances}
        autoAlignmentOptions={autoAlignmentOptions}
        snapThreshold={snapThreshold}
        showMeasurements={showMeasurements}
        enableSmartGuides={enableSmartGuides}
        enableDistributionGuides={enableDistributionGuides}
        enableSpacingGuides={enableSpacingGuides}
        enableAdvancedAlignment={enableAdvancedAlignment}
        enableCenterSnapping={enableCenterSnapping}
      />
    </div>
  );
};

const NodeOuter = ({ id, ...props }: NodeProps) => {
  return (
    <ReactFlowProvider>
      <Node id={id} {...props} />
    </ReactFlowProvider>
  );
};

export default NodeOuter;
