import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { EditableNode, Loader, Node, QuickView } from "@/components";

import Editor from "./components/Editor";
import { NodeProvider } from "./hooks/useNode/provider";
import useSpace from "./hooks/useSpace";

function App() {
  const { pageId } = useParams();
  const { space, spaceError, synced: spaceSynced, connected: spaceConnected } = useSpace();

  const [nodePage] = useQueryParam<string>("nodePage");

  if (!space && spaceError) return <>Not found</>;
  if (!spaceSynced) return <Loader message="Loading space..." />;
  if (!spaceConnected) return <Loader message="Obtaining connection for space..." />;

  const nodeId = pageId ?? "bfa9d7af-b857-4a69-a4fe-71b909327843";

  return (
    <div className="h-full relative flex flex-col">
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
