import "./index.css";

import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import App from "./App";
import ErrorPage from "./components/ErrorPage";
import { SpaceProvider } from "./hooks/useSpace/provider";

const queryClient = new QueryClient();

const addProviders = (element: ReactNode) => {
  return <SpaceProvider>{element}</SpaceProvider>;
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
