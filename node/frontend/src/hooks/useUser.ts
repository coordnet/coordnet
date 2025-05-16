import { useQuery } from "@tanstack/react-query";

import { getMe, getProfile, logout } from "@/api";
import { Me } from "@/types";

const useUser = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });
  const user: Me | undefined =
    !isLoading && data
      ? data
      : !isLoading && error
        ? { id: "public", name: "public", email: "public", profile: "public" }
        : undefined;

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.profile],
    queryFn: ({ signal }) => getProfile(signal, user?.profile ?? ""),
    enabled: !!user?.profile,
    retry: false,
  });

  return { user, profile, isLoading, isGuest: user?.id === "public", logout };
};

export default useUser;
