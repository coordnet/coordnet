import "react-tooltip/dist/react-tooltip.css";
import "./index.css";
import "./instrument";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";

import { FocusProvider, QuickViewProvider } from "@/hooks";

import Login from "./auth/Login";
import ResetPassword from "./auth/ResetPassword";
import ResetPasswordConfirm from "./auth/ResetPasswordConfirm";
import Signup from "./auth/Signup";
import VerifyEmail from "./auth/VerifyEmail";
import { Profile } from "./components";
import ErrorPage from "./components/ErrorPage";
import Dashboard from "./Dashboard";
import Method from "./Method";
import Space from "./Space";

const queryClient = new QueryClient();

const addProviders = (element: ReactNode) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      {/* <SpaceProvider> */}
      <FocusProvider>
        <QuickViewProvider>{element}</QuickViewProvider>
      </FocusProvider>
      {/* </SpaceProvider> */}
    </QueryParamProvider>
  );
};

const SpaceRedirect = () => {
  const { spaceId, pageId } = useParams();
  return <Navigate to={`/spaces/${spaceId}${pageId ? `/${pageId}` : ""}`} replace />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/spaces/:spaceId/:pageId?",
    element: addProviders(<Space />),
    errorElement: <ErrorPage />,
  },
  {
    // Edit view
    path: "/methods/:methodId/:pageId?",
    element: addProviders(<Method />),
    errorElement: <ErrorPage />,
  },
  {
    // View a run from a method without a version (own method)
    path: "/methods/:methodId/:pageId?/runs/:runId?",
    element: addProviders(<Method />),
    errorElement: <ErrorPage />,
  },
  {
    // View a method version (not owner)
    path: "/methods/:methodId/version/:versionId/:pageId?",
    element: addProviders(<Method />),
    errorElement: <ErrorPage />,
  },
  {
    // View a method version run (not owner)
    path: "/methods/:methodId/version/:versionId/:pageId?/runs/:runId?",
    element: addProviders(<Method />),
    errorElement: <ErrorPage />,
  },
  {
    path: "/space/:spaceId/:pageId?",
    element: <SpaceRedirect />,
  },
  {
    path: "/profiles/:username",
    element: <Profile />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/login",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/reset-password",
    element: <ResetPassword />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/reset-password/sent",
    element: <ResetPassword />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/reset-password/:token",
    element: <ResetPasswordConfirm />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/signup",
    element: <Signup />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/signup/sent",
    element: <Signup />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/auth/verify-email/:token",
    element: <VerifyEmail />,
    errorElement: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>
);
