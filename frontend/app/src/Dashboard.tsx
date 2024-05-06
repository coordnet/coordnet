import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { Loader } from "@/components";

import { getMe, getSpaces } from "./api";
import ErrorPage from "./components/ErrorPage";
import { CustomError } from "./utils";

function Dashboard() {
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!userLoading && !user) window.location.href = "/auth/login";
  }, [user, userLoading]);

  if (userLoading || spacesLoading) return <Loader message="Loading" />;

  if (!spaces || spaces.length === 0)
    return <ErrorPage error={new CustomError({ code: "NO_SPACES", name: "", message: "" })} />;

  return <Navigate to={`/spaces/${spaces?.[0].id}`} replace />;
}

export default Dashboard;
