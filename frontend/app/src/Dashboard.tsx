import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { getSpaces } from "@/api";
import { Loader } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import useUser from "@/hooks/useUser";
import { CustomError } from "@/lib/utils";

function Dashboard() {
  const { user, isGuest, isLoading: userLoading } = useUser();
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: ({ signal }) => getSpaces(signal),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!userLoading && isGuest) window.location.href = "/auth/login";
  }, [isGuest, userLoading]);

  if (userLoading || spacesLoading) return <Loader message="Loading" />;

  if (!spaces || spaces.count === 0)
    return <ErrorPage error={new CustomError({ code: "NO_SPACES", name: "", message: "" })} />;

  return <Navigate to={`/spaces/${spaces?.results[0].id}`} replace />;
}

export default Dashboard;
