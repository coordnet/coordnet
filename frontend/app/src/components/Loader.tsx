const Loader = ({ message }: { message: string }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-100 flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full size-5 border-t-2 border-b-2 border-blue-500"></div>
      <p className="text-lg font-medium text-blue-500 ml-5">{message}</p>
    </div>
  );
};

export default Loader;
