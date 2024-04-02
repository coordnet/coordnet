import clsx from "clsx";
import Slider from "rc-slider";

const Depth = ({
  depth,
  setDepth,
  className,
}: {
  depth: number;
  setDepth: React.Dispatch<React.SetStateAction<number>>;
  className?: string;
}) => {
  return (
    <div className={clsx("bg-gray-6 py-2 mb-1 mt-3 rounded", className)}>
      <div className="mx-2 flex items-center">
        <Slider
          className="ml-2"
          min={0}
          step={1}
          onChangeComplete={(v) => setDepth(v as number)}
          dots
          max={5}
          defaultValue={depth}
        />
        <span className="text-neutral-500 font-bold text-xs ml-3 self-end">Depth</span>
      </div>
    </div>
  );
};

export default Depth;
