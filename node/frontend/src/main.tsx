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

import {
  FocusProvider,
  ModalProvider,
  NodeCopyProvider,
  QuickViewProvider,
  YDocProvider,
} from "@/hooks";

import Login from "./auth/Login";
import ResetPassword from "./auth/ResetPassword";
import ResetPasswordConfirm from "./auth/ResetPasswordConfirm";
import Signup from "./auth/Signup";
import VerifyEmail from "./auth/VerifyEmail";
import { Profile, SkillsRunner } from "./components";
import ErrorPage from "./components/ErrorPage";
import Dashboard from "./Dashboard";
import Skill from "./Skill";
import Space from "./Space";

const queryClient = new QueryClient();

const addProviders = (element: ReactNode) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      {/* <SpaceProvider> */}
      <YDocProvider>
        <FocusProvider>
          <NodeCopyProvider>
            <ModalProvider>
              <QuickViewProvider>{element}</QuickViewProvider>
            </ModalProvider>
          </NodeCopyProvider>
        </FocusProvider>
      </YDocProvider>
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
    element: addProviders(<Dashboard />),
    errorElement: <ErrorPage />,
  },
  {
    path: "/spaces/:spaceId/:pageId?",
    element: addProviders(<Space />),
    errorElement: <ErrorPage />,
  },
  {
    // Edit view
    path: "/skills/:skillId/:pageId?",
    element: addProviders(<Skill />),
    errorElement: <ErrorPage />,
  },
  {
    // View a run from a skill without a version (own skill)
    path: "/skills/:skillId/:pageId?/runs/:runId?",
    element: addProviders(<Skill />),
    errorElement: <ErrorPage />,
  },
  {
    // View a skill version (not owner)
    path: "/skills/:skillId/versions/:versionId/:pageId?",
    element: addProviders(<Skill />),
    errorElement: <ErrorPage />,
  },
  {
    // View a skill version run (not owner)
    path: "/skills/:skillId/versions/:versionId/:pageId?/runs/:runId?",
    element: addProviders(<Skill />),
    errorElement: <ErrorPage />,
  },
  {
    // Use a skills runner page
    path: "/skills-runner/:skillId/:versionId/:runId?",
    element: addProviders(<SkillsRunner />),
    errorElement: <ErrorPage />,
  },
  {
    path: "/space/:spaceId/:pageId?",
    element: <SpaceRedirect />,
  },
  {
    path: "/profiles/:username",
    element: addProviders(<Profile />),
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

declare global {
  interface Window {
    __rootContainer: ReactDOM.Root;
  }
}

const container = document.getElementById("root")!;

if (!window.__rootContainer) {
  window.__rootContainer = ReactDOM.createRoot(container);
}

window.__rootContainer.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>
);
