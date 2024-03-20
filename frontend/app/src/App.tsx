import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { EditableNode, Editor, Loader, Node, NodeRepository, QuickView } from "@/components";
import { NodeProvider, useSpace } from "@/hooks";

function App() {
  const { pageId } = useParams();
  const {
    space,
    spaceError,
    synced: spaceSynced,
    connected: spaceConnected,
    // deletedNodes,
  } = useSpace();

  const [nodePage] = useQueryParam<string>("nodePage");

  // useEffect(() => {
  //   const toDelete = ["b597a0ac-1b6d-48e5-97a9-832961a26ac1"];
  //   deletedNodes?.insert(0, toDelete);
  // }, [deletedNodes]);

  if (!space && spaceError) return <>Not found</>;
  if (!spaceSynced) return <Loader message="Loading space..." />;
  if (!spaceConnected) return <Loader message="Obtaining connection for space..." />;

  const nodeId = pageId ?? space?.default_node_id ?? "";

  return (
    <div className="h-full relative flex flex-col">
      <NodeRepository />
      <div className="h-9 flex items-center px-4 border-b gap-2">
        <div className="">{space?.title}</div>
        <div className="">&raquo;</div>
        <EditableNode id={nodeId} className="line-clamp-1 w-64" />
      </div>
      <Node key={nodeId} id={nodeId} className="flex-grow w-full" />
      <NodeProvider id={nodePage}>
        <Editor
          id={nodePage}
          key={nodePage}
          className="absolute top-9 right-0 bottom-0 w-1/2 z-20 bg-white shadow-md"
        />
      </NodeProvider>
      <QuickView />
    </div>
  );
}

export default App;
