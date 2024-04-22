import clsx from "clsx";
import { Redo2, Undo2 } from "lucide-react";
import { Panel } from "reactflow";

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
    <Panel position="top-right" className={clsx("flex gap-1 !top-0 !right-2 !m-0", className)}>
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
