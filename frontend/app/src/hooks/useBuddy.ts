import { useQuery } from "@tanstack/react-query";
import useLocalStorageState from "use-local-storage-state";

import { getBuddies } from "@/api";

const useBuddy = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["buddies"],
    queryFn: ({ signal }) => getBuddies(signal),
    initialData: [],
  });

  const [buddyId, setBuddyId] = useLocalStorageState<string>(`coordnet:buddy`, {
    defaultValue: "87e503e8-14ba-4e95-b31c-e626d5cb7752",
  });
  const buddy = data.find((buddy) => buddy.id == buddyId);

  return {
    buddy,
    buddyId,
    setBuddyId,
    buddies: data,
    isLoading,
  };
};

export default useBuddy;
