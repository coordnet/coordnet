import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";

import { getBuddies } from "@/api";

const useBuddy = () => {
  const { skillId, versionId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["buddies"],
    queryFn: ({ signal }) => getBuddies(signal),
    initialData: { count: 0, next: "", previous: null, results: [] },
  });

  const [buddyId, setBuddyId] = useLocalStorageState<string>(
    `coordnet:buddy` +
      (skillId ? `:skill-${skillId}` : "") +
      (versionId ? `:version-${versionId}` : "")
  );
  const buddy = data?.results?.find((buddy) => buddy.id == buddyId);

  useEffect(() => {
    if (!buddyId && data?.results?.length > 0) {
      setBuddyId(data.results[0].id);
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
