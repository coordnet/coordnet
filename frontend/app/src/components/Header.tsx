import clsx from "clsx";
import { Link } from "react-router-dom";

import { useSpace } from "@/hooks";

const Header = ({ id, className }: { id: string; className?: string }) => {
  const { space, nodes, breadcrumbs } = useSpace();

  return (
    <div className={clsx("h-9 flex items-center px-4 border-b gap-2", className)}>
      <Link
        to={`/space/${space?.id}/${space?.default_node?.public_id}`}
        className="hover:underline text-black font-normal"
      >
        {space?.title}
      </Link>
      {Boolean(breadcrumbs.length > 0) && <div className="">&raquo;</div>}
      {breadcrumbs.map((id, index) => (
        <div key={id} className="flex items-center gap-2">
          <Link to={`/space/${space?.id}/${id}`} className="hover:underline text-black font-normal">
            {nodes.find((n) => n.id === id)?.title}
          </Link>
          {index < breadcrumbs.length - 1 && <div className="">&raquo;</div>}
        </div>
      ))}
      {breadcrumbs[breadcrumbs.length - 1] !== id && id != space?.default_node?.public_id && (
        <div className="flex items-center gap-2">
          <div className="">&raquo;</div>
          <Link to={`/space/${space?.id}/${id}`} className="hover:underline text-black font-normal">
            {nodes.find((n) => n.id === id)?.title}
          </Link>
        </div>
      )}
    </div>
  );
};

export default Header;
