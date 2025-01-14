import { useQuery } from "@tanstack/react-query";

import { getMethod, getSpace } from "@/api";
import { BackendEntityType, BackendParent } from "@/types";

/**
 * Custom hook to fetch data for either a node, method, or space from the backend.
 *
 * @param {string | undefined} nodeId - The ID of the node to fetch. If undefined, methodId or spaceId must be provided.
 * @param {string | undefined} methodId - The ID of the method to fetch. If undefined, nodeId or spaceId must be provided.
 * @param {string | undefined} spaceId - The ID of the space to fetch. If undefined, nodeId or methodId must be provided.
 * @throws {Error} Throws an error if all nodeId, methodId, and spaceId are undefined.
 * @returns {BackendParent} An object containing:
 * - id: The ID of the fetched entity (node, method, or space).
 * - type: The type of the fetched entity (BackendEntityType.NODE, BackendEntityType.METHOD, or BackendEntityType.SPACE).
 * - data: The fetched data.
 * - isLoading: A boolean indicating if the data is still being loaded.
 */
const useBackendParent = (
  methodId: string | undefined,
  spaceId: string | undefined
): BackendParent => {
  const isMethod = Boolean(methodId);
  const isSpace = Boolean(spaceId);

  const {
    data: method,
    error: methodError,
    isLoading: methodLoading,
  } = useQuery({
    queryKey: ["methods", methodId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getMethod(signal, methodId!),
    enabled: isMethod,
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

  if (isMethod) {
    return {
      id: methodId!,
      type: BackendEntityType.METHOD,
      data: method,
      error: methodError,
      isLoading: methodLoading,
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
