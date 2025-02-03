import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getSkill, getSpace } from "@/api";
import { BackendEntityType, BackendParent } from "@/types";

/**
 * Custom hook to fetch data for either a node, skill, or space from the backend.
 *
 * @throws {Error} Throws an error if all nodeId, skillId, and spaceId are undefined.
 * @returns {BackendParent} An object containing:
 * - id: The ID of the fetched entity (node, skill, or space).
 * - type: The type of the fetched entity (BackendEntityType.NODE, BackendEntityType.SKILL, or BackendEntityType.SPACE).
 * - data: The fetched data.
 * - isLoading: A boolean indicating if the data is still being loaded.
 */
const useBackendParent = (): BackendParent => {
  const { spaceId, skillId } = useParams();
  const isSkill = Boolean(skillId);
  const isSpace = Boolean(spaceId);

  const {
    data: skill,
    error: skillError,
    isLoading: skillLoading,
  } = useQuery({
    queryKey: ["skills", skillId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getSkill(signal, skillId!),
    enabled: isSkill,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: space,
    error: spaceError,
    isLoading: spaceLoading,
  } = useQuery({
    queryKey: ["spaces", spaceId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getSpace(signal, spaceId!),
    enabled: isSpace,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isSkill) {
    return {
      id: skillId!,
      type: BackendEntityType.SKILL,
      data: skill,
      error: skillError,
      isLoading: skillLoading,
    };
  } else {
    return {
      id: spaceId!,
      type: BackendEntityType.SPACE,
      data: space,
      error: spaceError,
      isLoading: spaceLoading,
    };
  }
};

export default useBackendParent;
