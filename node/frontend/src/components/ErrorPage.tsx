import clsx from "clsx";
import { ReactNode, useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { ErrorObject, serializeError } from "serialize-error";

import { isAxiosError } from "@/api";
import useUser from "@/hooks/useUser";

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
  const { logout } = useUser();
  const routerError = useRouteError();
  const parsedError = serializeError(error ? error : routerError) as ErrorObject;

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
    ERR_NOT_FOUND: {
      title: "404: Not Found",
      subTitle: "The requested resource could not be found",
      message: `${parsedError.data}`,
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
              logout();
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

  let errorCode = parsedError.code ?? "default";
  if (errorCode === "default" && parsedError.status && parsedError.status === 404) {
    errorCode = "ERR_NOT_FOUND";
  }
  const { title, subTitle, message } = errorCodes[errorCode] || errorCodes.default;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      id="error-page"
      className={clsx(
        "z-100 fixed bottom-0 left-0 right-0 top-0 flex size-full justify-center bg-gray-100",
        className
      )}
    >
      <div className="max-w-[700px] self-center grayscale">
        <div className="mb-4 flex items-center justify-center">
          <img src="/static/coordination-network.png" alt="Error" className="mr-3 w-12" />
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <p className="mb-2 text-center text-lg text-gray-700">{subTitle}</p>
        <p className="text-md text-center italic leading-7 text-gray-500">{message}</p>
        {isAxiosError(error) && (
          <p className="mt-4 text-center text-sm italic leading-7 text-gray-500">
            {error?.config?.method?.toUpperCase()} {error?.config?.url}
          </p>
        )}
      </div>
    </div>
  );
}
