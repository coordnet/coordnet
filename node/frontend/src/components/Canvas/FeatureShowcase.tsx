import React, { useState } from "react";
import { CanvasNode } from "@coordnet/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlignHorizontalDistributeCenter, 
  AlignVerticalDistributeCenter,
  Grid,
  MousePointer,
  Ruler,
  Settings,
  Zap,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

interface FeatureShowcaseProps {
  onFeatureActivate: (feature: string) => void;
  currentFeatures: {
    alignmentGuides: boolean;
    pixelDistances: boolean;
    autoAlignment: boolean;
    multiSelect: boolean;
    smartSnapping: boolean;
    grid: boolean;
  };
}

export const FeatureShowcase = ({ onFeatureActivate, currentFeatures }: FeatureShowcaseProps) => {
  const [activeTab, setActiveTab] = useState("basics");

  const features = {
    basics: [
      {
        id: "alignment-guides",
        title: "Alignment Guides",
        description: "Visual guides that appear when dragging nodes near other nodes",
        icon: AlignHorizontalDistributeCenter,
        enabled: currentFeatures.alignmentGuides,
        shortcut: "Auto",
        demo: "Drag a node near another to see alignment guides"
      },
      {
        id: "pixel-distances",
        title: "Pixel Distances",
        description: "Show exact distances between nodes when holding Alt",
        icon: Ruler,
        enabled: currentFeatures.pixelDistances,
        shortcut: "Alt + Drag",
        demo: "Hold Alt and drag a node to see distances"
      },
      {
        id: "auto-alignment",
        title: "Auto Alignment",
        description: "Automatically position new nodes in organized patterns",
        icon: Grid,
        enabled: currentFeatures.autoAlignment,
        shortcut: "Auto",
        demo: "Add new nodes to see automatic alignment"
      }
    ],
    advanced: [
      {
        id: "multi-select",
        title: "Multi-Select & Resize",
        description: "Select and manipulate multiple nodes simultaneously",
        icon: MousePointer,
        enabled: currentFeatures.multiSelect,
        shortcut: "Ctrl + Click",
        demo: "Ctrl+Click to select multiple nodes"
      },
      {
        id: "smart-snapping",
        title: "Smart Snapping",
        description: "Automatically snap nodes to nearby elements",
        icon: Zap,
        enabled: currentFeatures.smartSnapping,
        shortcut: "Auto",
        demo: "Drag nodes near others to see snapping"
      },
      {
        id: "grid",
        title: "Grid System",
        description: "Customizable grid for precise node placement",
        icon: Grid,
        enabled: currentFeatures.grid,
        shortcut: "Auto",
        demo: "Nodes snap to grid lines automatically"
      }
    ]
  };

  const handleFeatureToggle = (featureId: string) => {
    onFeatureActivate(featureId);
  };

  const handleDemo = (featureId: string) => {
    // Trigger demo for the feature
    console.log(`Demo for ${featureId}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Canvas Features Showcase</h2>
        <p className="text-gray-600">
          Explore and test all canvas features. Click on features to enable/disable them.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basics">Basic Features</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.basics.map((feature) => (
              <Card key={feature.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <feature.icon className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    <Badge variant={feature.enabled ? "default" : "secondary"}>
                      {feature.enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shortcut:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {feature.shortcut}
                    </code>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant={feature.enabled ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={() => handleFeatureToggle(feature.id)}
                    >
                      {feature.enabled ? "Disable" : "Enable"} Feature
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDemo(feature.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Try Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.advanced.map((feature) => (
              <Card key={feature.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <feature.icon className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    <Badge variant={feature.enabled ? "default" : "secondary"}>
                      {feature.enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shortcut:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {feature.shortcut}
                    </code>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant={feature.enabled ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={() => handleFeatureToggle(feature.id)}
                    >
                      {feature.enabled ? "Disable" : "Enable"} Feature
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDemo(feature.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Try Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Quick Tips</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• <strong>Alignment Guides:</strong> Drag nodes near others to see blue alignment lines</li>
          <li>• <strong>Pixel Distances:</strong> Hold Alt while dragging to see exact distances</li>
          <li>• <strong>Multi-Select:</strong> Ctrl+Click to select multiple nodes</li>
          <li>• <strong>Grid Snapping:</strong> Nodes automatically snap to grid when enabled</li>
          <li>• <strong>Smart Snapping:</strong> Nodes snap to other nodes and canvas edges</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-center space-x-4">
        <Button variant="outline" onClick={() => window.open('/QUICK_START.md', '_blank')}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Quick Start Guide
        </Button>
        <Button variant="outline" onClick={() => window.open('/CANVAS_FEATURES.md', '_blank')}>
          <Settings className="h-4 w-4 mr-2" />
          Full Documentation
        </Button>
      </div>
    </div>
  );
}; 