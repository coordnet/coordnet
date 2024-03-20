import "./index.css";
import "react-tooltip/dist/react-tooltip.css";

import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";

import { FocusProvider, QuickViewProvider, SpaceProvider } from "@/hooks";

import App from "./App";
import ErrorPage from "./components/ErrorPage";

const queryClient = new QueryClient();

const addProviders = (element: ReactNode) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      <SpaceProvider>
        <FocusProvider>
          <QuickViewProvider>{element}</QuickViewProvider>
        </FocusProvider>
      </SpaceProvider>
    </QueryParamProvider>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: addProviders(<div>Home</div>),
    errorElement: <ErrorPage />,
  },
  {
    path: "/space/:spaceId/:pageId?",
    element: addProviders(<App />),
    errorElement: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
