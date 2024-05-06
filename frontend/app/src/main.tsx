import "react-tooltip/dist/react-tooltip.css";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import store from "store2";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";

import { FocusProvider, QuickViewProvider, SpaceProvider } from "@/hooks";

import App from "./App";
import Login from "./auth/Login";
import ResetPassword from "./auth/ResetPassword";
import ResetPasswordConfirm from "./auth/ResetPasswordConfirm";
import Signup from "./auth/Signup";
import VerifyEmail from "./auth/VerifyEmail";
import ErrorPage from "./components/ErrorPage";
import Dashboard from "./Dashboard";

const queryClient = new QueryClient();

const withAuth = (children: JSX.Element) => {
  const authToken = store("coordnet-auth");
  if (authToken) {
    return <>{children}</>;
  } else {
    return <Navigate to="/auth/login" />;
  }
};

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
    element: withAuth(addProviders(<App />)),
    errorElement: <ErrorPage />,
  },
  {
    path: "/space/:spaceId/:pageId?",
    element: <SpaceRedirect />,
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
  </React.StrictMode>,
);
