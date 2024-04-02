import clsx from "clsx";
import { Link } from "react-router-dom";

import { useSpace } from "@/hooks";

const Header = ({ id, className }: { id: string; className?: string }) => {
  const { space, nodes, breadcrumbs } = useSpace();

  return (
    <div className={clsx("h-6 text-sm flex items-center px-3 gap-2", className)}>
      <Link
        to={`/space/${space?.id}`}
        className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
      >
        {space?.title}
      </Link>
      {Boolean(breadcrumbs.length > 0) && <div className="">&raquo;</div>}
      {breadcrumbs.map((id, index) => (
        <div key={id} className="flex items-center gap-2">
          <Link
            to={`/space/${space?.id}/${id}`}
            className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
          >
            {nodes.find((n) => n.id === id)?.title}
          </Link>
          {index < breadcrumbs.length - 1 && <div className="">&raquo;</div>}
        </div>
      ))}
      {breadcrumbs[breadcrumbs.length - 1] !== id && id != space?.default_node && (
        <div className="flex items-center gap-2">
          <div className="">&raquo;</div>
          <Link
            to={`/space/${space?.id}/${id}`}
            className="hover:underline text-neutral-500 hover:text-neutral-500 font-normal"
          >
            {nodes.find((n) => n.id === id)?.title}
          </Link>
        </div>
      )}
    </div>
  );
};

export default Header;
