import React, { createContext } from "react";

type AlignmentContextType = {
  showAlignmentGuides: boolean;
  setShowAlignmentGuides: React.Dispatch<React.SetStateAction<boolean>>;
  snapThreshold: number;
  setSnapThreshold: React.Dispatch<React.SetStateAction<number>>;
  showMeasurements: boolean;
  setShowMeasurements: React.Dispatch<React.SetStateAction<boolean>>;
  enableSmartGuides: boolean;
  setEnableSmartGuides: React.Dispatch<React.SetStateAction<boolean>>;
  enableSpacingGuides: boolean;
  setEnableSpacingGuides: React.Dispatch<React.SetStateAction<boolean>>;
  enableAdvancedAlignment: boolean;
  setEnableAdvancedAlignment: React.Dispatch<React.SetStateAction<boolean>>;
  enableCenterSnapping: boolean;
  setEnableCenterSnapping: React.Dispatch<React.SetStateAction<boolean>>;
  enableDiagonalGuides: boolean;
  setEnableDiagonalGuides: React.Dispatch<React.SetStateAction<boolean>>;
  enableDistanceMeasurements: boolean;
  setEnableDistanceMeasurements: React.Dispatch<React.SetStateAction<boolean>>;
  enableMultiSelect: boolean;
  setEnableMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  enableSmartSnapping: boolean;
  setEnableSmartSnapping: React.Dispatch<React.SetStateAction<boolean>>;
  gridSize: number;
  setGridSize: React.Dispatch<React.SetStateAction<number>>;
};

/**
 * Context for sharing alignment settings between components
 */
export const AlignmentContext = createContext<AlignmentContextType | undefined>(undefined);
