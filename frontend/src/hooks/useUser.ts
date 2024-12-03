import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import store from "store2";

import { getMe, getProfile } from "@/api";
import { Me } from "@/types";

const useUser = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });
  const [user, setUser] = useState<Me>();
  const token = store("coordnet-auth") || "public";

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

  const logout = () => {
    store.remove("coordnet-auth");
    window.location.href = "/auth/login";
  };

  return { user, profile, isLoading, isGuest: user?.id === "public", token, logout };
};

export default useUser;
