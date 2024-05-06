import clsx from "clsx";
import { ReactNode } from "react";
import { useRouteError } from "react-router-dom";
import { ErrorObject, serializeError } from "serialize-error";
import store from "store2";

import { isAxiosError } from "@/api";

interface ErrorInfo {
  title: string;
  subTitle: string;
  message: ReactNode;
}

export default function ErrorPage({
  error,
  className,
}: {
  error?: Error | null;
  className?: string;
}) {
  const routerError = useRouteError();
  const parsedError: ErrorObject = serializeError(error ? error : routerError);

  const errorCodes: { [key: string]: ErrorInfo } = {
    ERR_NETWORK: {
      title: "Network Error",
      subTitle: "An error occurred when making a request to the Coordination Network API",
      message:
        "This could be due to a network issue or the server is down. Please check your internet connection and that the Coordnet API is running.",
    },
    ERR_BAD_REQUEST: {
      title: "Request Error",
      subTitle: "There was an error in a request to the Coordination Network API",
      message: `${parsedError.name}: ${parsedError.message}`,
    },
    ERR_PERMISSION_DENIED: {
      title: "Permissions Error",
      subTitle: "You do not have permission to access this resource",
      message: `${parsedError.name}: ${parsedError.message}`,
    },
    NO_SPACES: {
      title: "No spaces",
      subTitle: "It looks like you haven't been added to any spaces yet",
      message: (
        <>
          Contact someone from Coordination.network to create one for you
          <br />
          <a
            href="#"
            className="underline"
            onClick={(e) => {
              store.remove("coordnet-auth");
              window.location.href = "/auth/login";
              e.preventDefault();
            }}
          >
            Log out
          </a>
        </>
      ),
    },
    default: {
      title: "Oops!",
      subTitle: "Sorry, an unexpected error has occurred.",
      message: `${parsedError.name}: ${parsedError.message}`,
    },
  };

  const errorCode = parsedError.code ?? "default";
  const { title, subTitle, message } = errorCodes[errorCode] || errorCodes.default;

  return (
    <div
      id="error-page"
      className={clsx(
        "fixed top-0 left-0 right-0 bottom-0 z-100 bg-gray-100 size-full flex justify-center",
        className,
      )}
    >
      <div className="self-center grayscale max-w-[700px]">
        <div className="flex items-center mb-4 justify-center">
          <img src="/coordination-network.png" alt="Error" className="w-12 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <p className="text-lg text-gray-700 mb-2 text-center">{subTitle}</p>
        <p className="text-md text-gray-500 italic text-center leading-7">{message}</p>
        {isAxiosError(error) && (
          <p className="text-sm text-gray-500 italic text-center leading-7 mt-4">
            {error?.config?.method?.toUpperCase()} {error?.config?.url}
          </p>
        )}
      </div>
    </div>
  );
}
