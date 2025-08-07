import { 
  Settings, 
  Grid, 
  AlignHorizontalDistributeCenter, 
  AlignVerticalDistributeCenter
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { AutoAlignmentOptions } from "./AutoAlignment";

interface AlignmentSettingsProps {
  autoAlignmentOptions: AutoAlignmentOptions;
  onAutoAlignmentChange: (options: AutoAlignmentOptions) => void;
  showAlignmentGuides: boolean;
  onShowAlignmentGuidesChange: (show: boolean) => void;
  showPixelDistances: boolean;
  onShowPixelDistancesChange: (show: boolean) => void;
  enableMultiSelect: boolean;
  onEnableMultiSelectChange: (enable: boolean) => void;
  enableSmartSnapping: boolean;
  onEnableSmartSnappingChange: (enable: boolean) => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  snapThreshold: number;
  onSnapThresholdChange: (threshold: number) => void;
  // New desktop enhancement options
  showMeasurements?: boolean;
  onShowMeasurementsChange?: (show: boolean) => void;
  enableSmartGuides?: boolean;
  onEnableSmartGuidesChange?: (enable: boolean) => void;
  enableDistributionGuides?: boolean;
  onEnableDistributionGuidesChange?: (enable: boolean) => void;
  enableSpacingGuides?: boolean;
  onEnableSpacingGuidesChange?: (enable: boolean) => void;
  enableAdvancedAlignment?: boolean;
  onEnableAdvancedAlignmentChange?: (enable: boolean) => void;
  enableCenterSnapping?: boolean;
  onEnableCenterSnappingChange?: (enable: boolean) => void;
}

export const AlignmentSettings = ({
  autoAlignmentOptions,
  onAutoAlignmentChange,
  showAlignmentGuides,
  onShowAlignmentGuidesChange,
  showPixelDistances,
  onShowPixelDistancesChange,
  enableMultiSelect,
  onEnableMultiSelectChange,
  enableSmartSnapping,
  onEnableSmartSnappingChange,
  gridSize,
  onGridSizeChange,
  snapThreshold,
  onSnapThresholdChange,
  // New desktop enhancement options
  showMeasurements = true,
  onShowMeasurementsChange,
  enableSmartGuides = true,
  onEnableSmartGuidesChange,
  enableDistributionGuides = true,
  onEnableDistributionGuidesChange,
  enableSpacingGuides = true,
  onEnableSpacingGuidesChange,
  enableAdvancedAlignment = true,
  onEnableAdvancedAlignmentChange,
  enableCenterSnapping = true,
  onEnableCenterSnappingChange,
}: AlignmentSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const alignmentModeIcons = {
    horizontal: AlignHorizontalDistributeCenter,
    vertical: AlignVerticalDistributeCenter,
    grid: Grid,
  };

  const IconComponent = alignmentModeIcons[autoAlignmentOptions.mode];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="size-9 flex-shrink-0 p-0">
          <Settings strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Alignment Features</h4>
            
            {/* Alignment Guides */}
            <div className="flex items-center justify-between">
              <Label htmlFor="alignment-guides" className="text-sm">
                Show alignment guides
              </Label>
              <Switch
                id="alignment-guides"
                checked={showAlignmentGuides}
                onCheckedChange={onShowAlignmentGuidesChange}
              />
            </div>

            {/* Pixel Distances */}
            <div className="flex items-center justify-between">
              <Label htmlFor="pixel-distances" className="text-sm">
                Show pixel distances (Alt key)
              </Label>
              <Switch
                id="pixel-distances"
                checked={showPixelDistances}
                onCheckedChange={onShowPixelDistancesChange}
              />
            </div>

            {/* Distance Measurements */}
            {onShowMeasurementsChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="show-measurements" className="text-sm">
                  Show distance measurements
                </Label>
                <Switch
                  id="show-measurements"
                  checked={showMeasurements}
                  onCheckedChange={onShowMeasurementsChange}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Auto Alignment</h4>
            
            {/* Auto Alignment Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-alignment" className="text-sm">
                Enable auto alignment
              </Label>
              <Switch
                id="auto-alignment"
                checked={autoAlignmentOptions.enabled}
                onCheckedChange={(enabled: boolean) =>
                  onAutoAlignmentChange({ ...autoAlignmentOptions, enabled })
                }
              />
            </div>

            {/* Alignment Mode */}
            <div className="space-y-1">
              <Label className="text-sm">Alignment mode</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span className="capitalize">{autoAlignmentOptions.mode}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      onAutoAlignmentChange({ ...autoAlignmentOptions, mode: "horizontal" })
                    }
                  >
                    <AlignHorizontalDistributeCenter className="mr-2 h-4 w-4" />
                    Horizontal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onAutoAlignmentChange({ ...autoAlignmentOptions, mode: "vertical" })
                    }
                  >
                    <AlignVerticalDistributeCenter className="mr-2 h-4 w-4" />
                    Vertical
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onAutoAlignmentChange({ ...autoAlignmentOptions, mode: "grid" })
                    }
                  >
                    <Grid className="mr-2 h-4 w-4" />
                    Grid
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Spacing */}
            <div className="space-y-1">
              <Label htmlFor="spacing" className="text-sm">
                Spacing: {autoAlignmentOptions.spacing}px
              </Label>
              <input
                id="spacing"
                type="range"
                min="10"
                max="100"
                value={autoAlignmentOptions.spacing}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onAutoAlignmentChange({
                    ...autoAlignmentOptions,
                    spacing: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Advanced Features</h4>
            
            {/* Multi-Select */}
            <div className="flex items-center justify-between">
              <Label htmlFor="multi-select" className="text-sm">
                Enable multi-select & resize
              </Label>
              <Switch
                id="multi-select"
                checked={enableMultiSelect}
                onCheckedChange={onEnableMultiSelectChange}
              />
            </div>

            {/* Smart Snapping */}
            <div className="flex items-center justify-between">
              <Label htmlFor="smart-snapping" className="text-sm">
                Enable smart snapping
              </Label>
              <Switch
                id="smart-snapping"
                checked={enableSmartSnapping}
                onCheckedChange={onEnableSmartSnappingChange}
              />
            </div>

            {/* Grid Size */}
            <div className="space-y-1">
              <Label htmlFor="grid-size" className="text-sm">
                Grid size: {gridSize}px
              </Label>
              <input
                id="grid-size"
                type="range"
                min="5"
                max="50"
                value={gridSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onGridSizeChange(parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Snap Threshold */}
            <div className="space-y-1">
              <Label htmlFor="snap-threshold" className="text-sm">
                Snap threshold: {snapThreshold}px
              </Label>
              <input
                id="snap-threshold"
                type="range"
                min="5"
                max="30"
                value={snapThreshold}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSnapThresholdChange(parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Desktop Enhancement Features */}
          <DropdownMenuSeparator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Desktop Enhancements</h4>
            
            {/* Advanced Alignment */}
            {onEnableAdvancedAlignmentChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="advanced-alignment" className="text-sm">
                  Advanced alignment types
                </Label>
                <Switch
                  id="advanced-alignment"
                  checked={enableAdvancedAlignment}
                  onCheckedChange={onEnableAdvancedAlignmentChange}
                />
              </div>
            )}

            {/* Center Snapping */}
            {onEnableCenterSnappingChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="center-snapping" className="text-sm">
                  Snap to center origin (0,0)
                </Label>
                <Switch
                  id="center-snapping"
                  checked={enableCenterSnapping}
                  onCheckedChange={onEnableCenterSnappingChange}
                />
              </div>
            )}

            {/* Smart Guides */}
            {onEnableSmartGuidesChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="smart-guides" className="text-sm">
                  Smart spacing & distribution
                </Label>
                <Switch
                  id="smart-guides"
                  checked={enableSmartGuides}
                  onCheckedChange={onEnableSmartGuidesChange}
                />
              </div>
            )}

            {/* Spacing Guides */}
            {onEnableSpacingGuidesChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="spacing-guides" className="text-sm">
                  Spacing consistency guides
                </Label>
                <Switch
                  id="spacing-guides"
                  checked={enableSpacingGuides}
                  onCheckedChange={onEnableSpacingGuidesChange}
                />
              </div>
            )}

            {/* Distribution Guides */}
            {onEnableDistributionGuidesChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="distribution-guides" className="text-sm">
                  Distribution pattern guides
                </Label>
                <Switch
                  id="distribution-guides"
                  checked={enableDistributionGuides}
                  onCheckedChange={onEnableDistributionGuidesChange}
                />
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2">
              💡 Hold <strong>Shift</strong> for high-precision alignment (1px)
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 