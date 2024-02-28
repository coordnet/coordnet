import { Loader, Node } from "./components";
import useSpace from "./hooks/useSpace";

function App() {
  const { space, synced: spaceSynced, connected: spaceConnected } = useSpace();

  if (!space) return <>Not found</>;
  if (!spaceSynced) return <Loader message="Loading space..." />;
  if (!spaceConnected) return <Loader message="Obtaining connection for space..." />;

  return (
    <div className="p-4">
      <div>Space: {space}</div>
      <div>Provider synced: {spaceSynced ? "yes" : "no"}</div>
      <div>Provider connected: {spaceConnected ? "yes" : "no"}</div>
      <Node id={"123"} title={space} className="px-3 py-2 size-full" />
    </div>
  );
}

export default App;
