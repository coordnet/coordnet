import {
  Settings,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  // Removed DropdownMenuItem - used in removed AutoAlignment section
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Removed AutoAlignment import - feature removed

interface AlignmentSettingsProps {
  // Removed autoAlignmentOptions props - feature removed
  showAlignmentGuides: boolean;
  onShowAlignmentGuidesChange: (show: boolean) => void;
  // Removed showPixelDistances - feature removed
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

  enableSpacingGuides?: boolean;
  onEnableSpacingGuidesChange?: (enable: boolean) => void;
  enableAdvancedAlignment?: boolean;
  onEnableAdvancedAlignmentChange?: (enable: boolean) => void;
  enableCenterSnapping?: boolean;
  onEnableCenterSnappingChange?: (enable: boolean) => void;
  enableDiagonalGuides?: boolean;
  onEnableDiagonalGuidesChange?: (enable: boolean) => void;
  enableDistanceMeasurements?: boolean;
  onEnableDistanceMeasurementsChange?: (enable: boolean) => void;
}

export const AlignmentSettings = ({
  // Removed autoAlignmentOptions parameter
  // Removed onAutoAlignmentChange parameter
  showAlignmentGuides,
  onShowAlignmentGuidesChange,
  // Removed showPixelDistances parameters
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

  enableSpacingGuides = true,
  onEnableSpacingGuidesChange,
  enableAdvancedAlignment = true,
  onEnableAdvancedAlignmentChange,
  enableCenterSnapping = true,
  onEnableCenterSnappingChange,
  enableDiagonalGuides = true,
  onEnableDiagonalGuidesChange,
  enableDistanceMeasurements = false,
  onEnableDistanceMeasurementsChange,
}: AlignmentSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Removed alignmentModeIcons - used in removed AutoAlignment section

  // Removed IconComponent - used in removed AutoAlignment section

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

            {/* Removed Pixel Distances feature */}

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

          {/* Removed Auto Alignment section - feature removed to avoid confusion with existing auto-layout */}

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
                  Smart spacing
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

            {/* Diagonal Guides */}
            {onEnableDiagonalGuidesChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="diagonal-guides" className="text-sm">
                  Diagonal guides (45°, 60°, etc.)
                </Label>
                <Switch
                  id="diagonal-guides"
                  checked={enableDiagonalGuides}
                  onCheckedChange={onEnableDiagonalGuidesChange}
                />
              </div>
            )}

            {/* Distance Measurements */}
            {onEnableDistanceMeasurementsChange && (
              <div className="flex items-center justify-between">
                <Label htmlFor="distance-measurements" className="text-sm">
                  Distance measurements
                </Label>
                <Switch
                  id="distance-measurements"
                  checked={enableDistanceMeasurements}
                  onCheckedChange={onEnableDistanceMeasurementsChange}
                />
              </div>
            )}

            <DropdownMenuSeparator />

            {/* Quick Presets */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Quick Presets</h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    // Designer preset - all features enabled
                    onEnableSmartGuidesChange?.(true);
                    onEnableSpacingGuidesChange?.(true);
                    onEnableDiagonalGuidesChange?.(true);
                    onEnableDistanceMeasurementsChange?.(true);
                    onEnableCenterSnappingChange?.(true);
                    onEnableAdvancedAlignmentChange?.(true);
                    onShowMeasurementsChange?.(true);
                    onSnapThresholdChange(5);
                  }}
                  className="p-2 text-xs bg-blue-50 hover:bg-blue-100 rounded border transition-colors"
                >
                  🎨 Designer
                  <div className="text-xs text-gray-500">All guides</div>
                </button>

                <button
                  onClick={() => {
                    // Simple preset - basic alignment only
                    onEnableSmartGuidesChange?.(true);
                    onEnableSpacingGuidesChange?.(false);
                    onEnableDiagonalGuidesChange?.(false);
                    onEnableDistanceMeasurementsChange?.(false);
                    onEnableCenterSnappingChange?.(true);
                    onEnableAdvancedAlignmentChange?.(true);
                    onShowMeasurementsChange?.(false);
                    onSnapThresholdChange(10);
                  }}
                  className="p-2 text-xs bg-green-50 hover:bg-green-100 rounded border transition-colors"
                >
                  ⚡ Simple
                  <div className="text-xs text-gray-500">Basic only</div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    // Developer preset - measurements focused
                    onEnableSmartGuidesChange?.(true);
                    onEnableSpacingGuidesChange?.(true);
                    onEnableDiagonalGuidesChange?.(false);
                    onEnableDistanceMeasurementsChange?.(true);
                    onEnableCenterSnappingChange?.(true);
                    onEnableAdvancedAlignmentChange?.(true);
                    onShowMeasurementsChange?.(true);
                    onSnapThresholdChange(1);
                  }}
                  className="p-2 text-xs bg-purple-50 hover:bg-purple-100 rounded border transition-colors"
                >
                  🔧 Developer
                  <div className="text-xs text-gray-500">Precise</div>
                </button>

                <button
                  onClick={() => {
                    // Minimal preset - disabled
                    onEnableSmartGuidesChange?.(false);
                    onEnableSpacingGuidesChange?.(false);
                    onEnableDiagonalGuidesChange?.(false);
                    onEnableDistanceMeasurementsChange?.(false);
                    onEnableCenterSnappingChange?.(false);
                    onEnableAdvancedAlignmentChange?.(false);
                    onShowMeasurementsChange?.(false);
                  }}
                  className="p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border transition-colors"
                >
                  🚫 Minimal
                  <div className="text-xs text-gray-500">Disabled</div>
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 pt-2 space-y-1">
              <div>
                💡 Hold <strong>Shift</strong> for high-precision alignment (1px)
              </div>
              <div>
                📏 Hold <strong>Alt</strong> for distance measurements
              </div>
              <div>🎯 Diagonal guides help with angular alignment</div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
