import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import useLocalStorageState from "use-local-storage-state";

import { getBuddies } from "@/api";

const useBuddy = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["buddies"],
    queryFn: ({ signal }) => getBuddies(signal),
    initialData: [],
  });

  const [buddyId, setBuddyId] = useLocalStorageState<string>(`coordnet:buddy`);
  const buddy = data.find((buddy) => buddy.id == buddyId);

  useEffect(() => {
    if (!buddyId && data.length > 0) {
      setBuddyId(data[0].id);
    }
  }, [data, buddyId, setBuddyId]);

  return {
    buddy,
    buddyId,
    setBuddyId,
    buddies: data,
    isLoading,
  };
};

export default useBuddy;
