import clsx from "clsx";

const Loader = ({ message, className }: { message: string; className?: string }) => {
  return (
    <div
      className={clsx(
        "z-100 fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-white",
        className
      )}
    >
      <div className="size-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      <p className="ml-5 text-lg font-medium text-blue-500">{message}</p>
    </div>
  );
};

export default Loader;
