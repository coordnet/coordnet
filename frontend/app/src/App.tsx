import { Loader, Node } from "./components";
import QuickView from "./components/QuickView";
import useSpace from "./hooks/useSpace";

function App() {
  const { space, synced: spaceSynced, connected: spaceConnected } = useSpace();

  // useEffect(() => {
  //   nodesMap?.set("node-1", { id: "node-1", title: "Node 1" });
  //   nodesMap?.set("node-2", { id: "node-2", title: "Node 2" });
  // }, []);

  if (!space) return <>Not found</>;
  if (!spaceSynced) return <Loader message="Loading space..." />;
  if (!spaceConnected) return <Loader message="Obtaining connection for space..." />;

  return (
    <div className="p-4">
      <div>Space: {space}</div>
      <div>Provider synced: {spaceSynced ? "yes" : "no"}</div>
      <div>Provider connected: {spaceConnected ? "yes" : "no"}</div>
      <Node id={"node-1"} className="px-3 py-2 size-full" />
      <QuickView />
    </div>
  );
}

export default App;
