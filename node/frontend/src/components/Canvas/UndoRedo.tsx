import { Panel } from "@xyflow/react";
import clsx from "clsx";
import { Redo2, Undo2 } from "lucide-react";

import { useYDoc } from "@/hooks";
import { BackendEntityType } from "@/types";

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
  const { parent } = useYDoc();
  const isSkill = parent.type === BackendEntityType.SKILL;

  return (
    <Panel
      position="top-right"
      className={clsx(
        "!m-0 flex w-fit gap-1",
        isSkill ? "!bottom-3 !left-3 !top-auto" : "!right-2 !top-0",
        className
      )}
    >
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
