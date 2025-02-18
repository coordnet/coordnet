import { Panel } from "@xyflow/react";
import clsx from "clsx";
import { Redo2, Undo2 } from "lucide-react";

import { Button } from "../ui/button";

const UndoRedo = ({
  undo,
  redo,
  canUndo,
  canRedo,
  className,
}: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}) => {
  return (
    <Panel position="top-right" className={clsx("!right-2 !top-0 !m-0 flex gap-1", className)}>
      <Button className="size-9 p-0" variant="outline" disabled={canUndo} onClick={undo}>
        <Undo2 className="size-5" />
      </Button>
      <Button className="size-9 p-0" variant="outline" disabled={canRedo} onClick={redo}>
        <Redo2 className="size-5" />
      </Button>
    </Panel>
  );
};

export default UndoRedo;
