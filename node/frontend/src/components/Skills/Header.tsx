import clsx from "clsx";
import { EllipsisVertical, Home } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYDoc } from "@/hooks";
import { BackendEntityType } from "@/types";

import { Loader } from "../";
import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import SkillActionsDropdown from "./SkillActionsDropdown";

const Header = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { runId } = useParams();
  const {
    parent,
    canvas: { error, connected, synced },
  } = useYDoc();

  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || parent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  const skill = parent.type === BackendEntityType.SKILL ? parent.data : undefined;
  const skillTitle = skill?.title ?? "Untitled";

  const handleNavigateAfterDelete = () => {
    navigate("/");
  };

  return (
    <div
      className={clsx(
        `absolute left-3 top-3 z-30 flex items-center gap-2 rounded border border-neutral-200
        bg-white p-2 shadow-node-repo`,
        className
      )}
    >
      <Link to="/">
        <Button variant="outline" className="flex size-9 items-center rounded px-3">
          <Home className="size-4 flex-shrink-0 text-neutral-500" />
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center">
          <div className="px-3 text-lg font-medium text-black">{skillTitle}</div>
          <Button variant="ghost" className="flex size-6 items-center rounded px-3">
            <EllipsisVertical className="size-4 flex-shrink-0 text-neutral-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {skill && (
            <SkillActionsDropdown
              skill={skill}
              variant="header"
              onNavigate={handleNavigateAfterDelete}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default Header;
