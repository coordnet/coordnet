import clsx from "clsx";
import { useRouteError } from "react-router-dom";
import { serializeError } from "serialize-error";

export default function ErrorPage({ className }: { className?: string }) {
  const error = serializeError(useRouteError());

  return (
    <div id="error-page" className={clsx("bg-gray-100 size-full flex justify-center", className)}>
      <div className="self-center grayscale">
        <div className="flex items-center mb-4 justify-center">
          <img src="/coordination-network.png" alt="Error" className="w-12 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Oops!</h1>
        </div>
        <p className="text-lg text-gray-700 mb-2">Sorry, an unexpected error has occurred.</p>
        <p className="text-md text-gray-500 italic">
          {error.name}: {error.message}
        </p>
      </div>
    </div>
  );
}
