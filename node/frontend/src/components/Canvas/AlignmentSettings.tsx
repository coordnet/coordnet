import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAlignment } from './hooks/useAlignment';

export function AlignmentSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, toggleGuide, updateSettings } = useAlignment();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="size-9 flex-shrink-0 p-0">
          <Settings strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <div className="p-4 space-y-4">
          
          {/* Basic Alignment */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Alignment Guides</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="alignment-guides" className="text-sm">
                Basic alignment
              </Label>
              <Switch
                id="alignment-guides"
                checked={settings.guides.alignment}
                onCheckedChange={() => toggleGuide('alignment')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="diagonal-guides" className="text-sm">
                Diagonal (45°, 60°...)
              </Label>
              <Switch
                id="diagonal-guides"
                checked={settings.guides.diagonal}
                onCheckedChange={() => toggleGuide('diagonal')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="center-guides" className="text-sm">
                Center snapping (0,0)
              </Label>
              <Switch
                id="center-guides"
                checked={settings.guides.center}
                onCheckedChange={() => toggleGuide('center')}
              />
            </div>

           <div className="flex items-center justify-between">
  <Label htmlFor="distance-guides" className="text-sm">
    Distance measurements (always on)
  </Label>
  <Switch
    id="distance-guides"
    checked={settings.guides.distance}
    onCheckedChange={() => toggleGuide('distance')}
  />
</div>
          </div>

          <DropdownMenuSeparator />

          {/* Precision Settings */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Precision</h4>

            <div className="space-y-1">
              <Label htmlFor="snap-threshold" className="text-sm">
                Snap threshold: {settings.snapThreshold}px
              </Label>
              <input
                id="snap-threshold"
                type="range"
                min="3"
                max="20"
                value={settings.snapThreshold}
                onChange={(e) => updateSettings({ snapThreshold: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-measurements" className="text-sm">
                Show measurements
              </Label>
              <Switch
                id="show-measurements"
                checked={settings.showMeasurements}
                onCheckedChange={(checked) => updateSettings({ showMeasurements: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-alignment" className="text-sm">
                Enable alignment system
              </Label>
              <Switch
                id="enable-alignment"
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSettings({ enabled: checked })}
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Quick Presets</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({
                  guides: { alignment: true, diagonal: true, distance: true, center: true },
                  snapThreshold: 5,
                  showMeasurements: true
                })}
                className="p-2 text-xs bg-blue-50 hover:bg-blue-100 rounded border transition-colors"
              >
                Designer
                <div className="text-xs text-gray-500">All guides</div>
              </button>
              
              <button
                onClick={() => updateSettings({
                  guides: { alignment: true, diagonal: false, distance: false, center: true },
                  snapThreshold: 10,
                  showMeasurements: false
                })}
                className="p-2 text-xs bg-green-50 hover:bg-green-100 rounded border transition-colors"
              >
                Simple
                <div className="text-xs text-gray-500">Basic only</div>
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2 space-y-1">
            <div>💡 Hold <strong>Shift</strong> for 1px precision</div>
            <div>📏 Hold <strong>Alt</strong> for distance measurements</div>
            <div>🎯 Drag nodes near others to see guides</div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}