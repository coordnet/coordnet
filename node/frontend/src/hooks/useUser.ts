import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getMe, getProfile, logout } from "@/api";
import { Me } from "@/types";

const useUser = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });
  const [user, setUser] = useState<Me>();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.profile],
    queryFn: ({ signal }) => getProfile(signal, user?.profile ?? ""),
    enabled: !!user?.profile,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && data) {
      setUser(data);
    } else if (!isLoading && error) {
      setUser({ id: "public", name: "public", email: "public", profile: "public" });
    }
  }, [data, isLoading, error]);

  return { user, profile, isLoading, isGuest: user?.id === "public", logout };
};

export default useUser;
