import React, { useState } from "react";

import { AlignmentContext } from "./context";

/**
 * Provider for sharing alignment settings between components
 */
export const AlignmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [snapThreshold, setSnapThreshold] = useState(10);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [enableSmartGuides, setEnableSmartGuides] = useState(true);
  const [enableSpacingGuides, setEnableSpacingGuides] = useState(true);
  const [enableAdvancedAlignment, setEnableAdvancedAlignment] = useState(true);
  const [enableCenterSnapping, setEnableCenterSnapping] = useState(true);
  const [enableDiagonalGuides, setEnableDiagonalGuides] = useState(true);
  const [enableDistanceMeasurements, setEnableDistanceMeasurements] = useState(false);
  const [enableMultiSelect, setEnableMultiSelect] = useState(true);
  const [enableSmartSnapping, setEnableSmartSnapping] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  const value = {
    showAlignmentGuides,
    setShowAlignmentGuides,
    snapThreshold,
    setSnapThreshold,
    showMeasurements,
    setShowMeasurements,
    enableSmartGuides,
    setEnableSmartGuides,
    enableSpacingGuides,
    setEnableSpacingGuides,
    enableAdvancedAlignment,
    setEnableAdvancedAlignment,
    enableCenterSnapping,
    setEnableCenterSnapping,
    enableDiagonalGuides,
    setEnableDiagonalGuides,
    enableDistanceMeasurements,
    setEnableDistanceMeasurements,
    enableMultiSelect,
    setEnableMultiSelect,
    enableSmartSnapping,
    setEnableSmartSnapping,
    gridSize,
    setGridSize,
  };

  return <AlignmentContext.Provider value={value}>{children}</AlignmentContext.Provider>;
};
