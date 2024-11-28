import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import store from "store2";

import { apiUrl } from "./constants";
import { CustomError, dataURItoBlob } from "./lib/utils";
import {
  ApiError,
  BackendNode,
  BackendNodeDetail,
  Buddy,
  LLMTokenCount,
  Me,
  NodeSearchResult,
  NodeVersion,
  PaginatedApiResponse,
  Permission,
  PermissionModel,
  Profile,
  ProfileCard,
  ProfileCardForm,
  ProfileForm,
  SemanticScholarPaper,
  Space,
} from "./types";

const authToken = store("coordnet-auth");

const headers: { [key: string]: string } = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

if (authToken) headers["Authorization"] = `Token ${authToken}`;

export const isAxiosError = <ResponseType>(error: unknown): error is AxiosError<ResponseType> => {
  return axios.isAxiosError(error);
};

export const api = axios.create({ baseURL: apiUrl, headers });
export const authApi = axios.create({ baseURL: apiUrl, headers });

api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.code === "ECONNABORTED" || error.code == "ERR_CANCELED") {
      return;
    }
    console.log(error);

    if (!error.response) {
      toast.error(error.message);
    }

    // if (error?.response?.status === 403) {
    //   toast.error("You do not have permission to access this resource");
    // }

    if (!error?.response?.config?.url?.includes("auth/login/") && error.response.status === 401) {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      const loginUrl = `/auth/login?redirect=${currentUrl}`;
      store.remove("coordnet-auth");
      window.location.href = loginUrl;
    }
    return Promise.reject(error);
  },
);

export const handleApiError = (
  e: unknown,
  formData: { [key: string]: unknown },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: any,
): void => {
  const error = isAxiosError(e);
  if (error) {
    if (e.response?.status == 400) {
      const errors = e.response.data as ApiError;
      for (const [key, value] of Object.entries(errors)) {
        if (key in formData) {
          setError(key, { type: "custom", message: value.join(" ") });
        } else {
          toast.error(`${key}: ${value.join(" ")}`);
        }
      }
    } else {
      console.error(e.response);
      const data = e.response?.data as { [key: string]: string };
      toast.error("detail" in data ? data.detail : `${data}`);
    }
  }
};

export const getMe: () => Promise<Me> = async () => {
  const data = await authApi.get("api/users/me/");
  return data.data;
};

export const getSpaces = async (
  signal: AbortSignal | undefined,
): Promise<PaginatedApiResponse<Space>> => {
  const response = await api.get("api/nodes/spaces/", { signal, params: { limit: 10000 } });
  return response.data;
};

export const getSpace = async (signal: AbortSignal | undefined, id?: string): Promise<Space> => {
  const response = await api.get(`api/nodes/spaces/${id}/`, { signal });
  return response.data;
};

export const updateSpace = async (id: string, data: Partial<Space>): Promise<Space> => {
  const response = await api.patch(`api/nodes/spaces/${id}/`, data);
  return response.data;
};

export const getSpacePermissions = async (
  signal: AbortSignal | undefined,
  id?: string,
): Promise<Permission[]> => {
  const response = await api.get(`api/nodes/spaces/${id}/permissions/`, { signal });
  return response.data;
};

export const createPermission = async (
  type: PermissionModel,
  spaceId: string,
  data: Pick<Permission, "role" | "user">,
): Promise<Permission[]> => {
  if (type == PermissionModel.Space) {
    const response = await api.post(`api/nodes/spaces/${spaceId}/permissions/`, data);
    return response.data;
  }
  return [];
};

export const getNodePermissions = async (
  signal: AbortSignal | undefined,
  id?: string,
): Promise<Permission[]> => {
  const response = await api.get(`api/nodes/nodes/${id}/permissions/`, { signal });
  return response.data;
};

// export const updatePermission = async (
//   type: PermissionModel,
//   spaceId: string,
//   id: string,
//   data: Pick<Permission, "role" | "user">,
// ): Promise<Permission[]> => {
//   if (type == PermissionModel.Space) {
//     const response = await api.patch(`api/nodes/spaces/${spaceId}/permissions/${id}`, data);
//     return response.data;
//   }
//   return [];
// };

export const deletePermission = async (
  type: PermissionModel,
  spaceId?: string,
  id?: string,
): Promise<Permission[]> => {
  if (type == PermissionModel.Space) {
    const response = await api.delete(`api/nodes/spaces/${spaceId}/permissions/${id}/`);
    return response.data;
  }
  return [];
};

export const getNode = async (
  signal: AbortSignal | undefined,
  id?: string,
): Promise<BackendNodeDetail> => {
  const response = await api.get(`api/nodes/nodes/${id}/`, { signal });
  return response.data;
};

export const getSpaceNodes = async (
  signal: AbortSignal | undefined,
  spaceId?: string,
): Promise<PaginatedApiResponse<BackendNode>> => {
  const response = await api.get("api/nodes/nodes/", {
    params: { space: spaceId, limit: 10000 },
    signal,
  });
  return response.data;
};

export const searchNodes = async (
  signal: AbortSignal | undefined,
  q: string,
  space: string,
): Promise<PaginatedApiResponse<NodeSearchResult>> => {
  const response = await api.get("api/nodes/search/", {
    params: { q, space, limit: 25 },
    signal,
  });
  return response.data;
};

export const getNodeVersions = async (
  signal: AbortSignal | undefined,
  document?: string,
  document_type: string = "GRAPH",
  offset: number = 0,
  limit: number = 10,
  ordering: string = "-created_at",
): Promise<PaginatedApiResponse<NodeVersion>> => {
  const response = await api.get("api/nodes/versions/", {
    params: { document, document_type, offset, limit, ordering },
    signal,
  });
  return response.data;
};

export const getBuddies = async (
  signal: AbortSignal | undefined,
): Promise<PaginatedApiResponse<Buddy>> => {
  const response = await api.get("api/buddies/", { signal });
  return response.data;
};

export const createBuddy = async (
  data: Pick<Buddy, "name" | "model" | "system_message" | "description">,
): Promise<Buddy> => {
  const response = await api.post("api/buddies/", data);
  return response.data;
};

export const updateBuddy = async (
  id: string,
  data: Pick<Buddy, "name" | "model" | "system_message" | "description">,
): Promise<Buddy> => {
  const response = await api.patch(`api/buddies/${id}/`, data);
  return response.data;
};

export const deleteBuddy = async (id: string): Promise<Buddy> => {
  const response = await api.delete(`api/buddies/${id}/`);
  return response.data;
};

export const getLLMTokenCount = async (
  buddyId: string | undefined,
  message: string,
  nodes: string[],
  level: number,
  signal: AbortSignal | undefined,
): Promise<LLMTokenCount> => {
  const response = await api.post(
    `api/buddies/${buddyId}/token_counts/`,
    { message, nodes, level },
    { signal },
  );

  return response.data;
};

export const querySemanticScholar = async (
  query: string,
  fields: string[] = [
    "title",
    "year",
    "referenceCount",
    "citationCount",
    "authors",
    "url",
    "abstract",
    "isOpenAccess",
  ],
  signal?: AbortSignal,
): Promise<SemanticScholarPaper[]> => {
  const response = await api.get<SemanticScholarPaper[]>("api/buddies/semantic/", {
    signal,
    params: { query, fields },
    paramsSerializer: { indexes: null },
  });
  return response.data;
};

/**
 * Fetches profiles from the API with optional filtering.
 *
 * @param signal - An AbortSignal to optionally abort the request.
 * @param filter - An optional filter to specify the type of profiles to fetch. Can be "user" or "space".
 * @returns A promise that resolves to a Profile object.
 */
export const getProfiles = async (
  signal: AbortSignal | undefined,
  filter?: "user" | "space",
): Promise<Profile[]> => {
  let params = {};
  if (filter) {
    params = { profile_type: filter };
  }
  const response = await api.get(`api/profiles/profiles/`, { signal, params });
  return response.data.results;
};

/**
 * Fetches the profile of a user by their username.
 *
 * @param signal - An optional AbortSignal to cancel the request.
 * @param user - The username of the user whose profile is to be fetched.
 * @returns A promise that resolves to the user's profile.
 * @throws CustomError if the user is not found.
 */
export const getProfileFromUsername = async (
  signal: AbortSignal | undefined,
  username: string,
): Promise<Profile> => {
  try {
    const response = await api.get("api/profiles/profiles/", {
      params: { slug: username },
      signal,
    });
    if (response.data.count === 0) throw new Error();
    return response.data.results[0];
  } catch {
    throw new CustomError({ code: "ERR_NOT_FOUND", name: "Username", message: username });
  }
};

/**
 * Fetches the profile data for a given profile ID.
 *
 * @param signal - An optional AbortSignal to cancel the request.
 * @param id - The ID of the profile to fetch.
 * @returns A promise that resolves to the profile data.
 */
export const getProfile = async (signal: AbortSignal | undefined, id: string): Promise<Profile> => {
  const response = await api.get(`api/profiles/profiles/${id}/`, { signal });
  return response.data;
};

/**
 * Updates the profile with the given ID using the provided data.
 *
 * @param id - The unique identifier of the profile to update.
 * @param data - An object containing the profile fields to update.
 * @returns A promise that resolves to the updated profile.
 */
export const updateProfile = async (id: string, data: ProfileForm): Promise<Profile> => {
  const response = await api.patch(`api/profiles/profiles/${id}/`, data);
  return response.data;
};

/**
 * Updates the profile cards for a given profile ID.
 *
 * @param id - The ID of the profile to update.
 * @param cards - An array of card identifiers to update the profile with.
 * @returns A promise that resolves to the updated Profile object.
 */
export const updateProfileCards = async (id: string, cards: string[]): Promise<Profile> => {
  const response = await api.patch(`api/profiles/profiles/${id}/`, { cards });
  return response.data;
};

/**
 * Updates the profile and banner images for a user profile.
 *
 * @param id - The unique identifier of the user profile.
 * @param profileImage - The data URI of the new profile image, or null if not updating.
 * @param bannerImage - The data URI of the new banner image, or null if not updating.
 * @returns A promise that resolves to the updated Profile object.
 *
 * @throws Will throw an error if the API request fails.
 */
export const updateProfileImages = async (
  id: string,
  profileImage: string | null,
  bannerImage: string | null,
): Promise<Profile> => {
  const formData = new FormData();
  if (profileImage) {
    formData.append("profile_image", dataURItoBlob(profileImage));
  }

  if (bannerImage) {
    formData.append("banner_image", dataURItoBlob(bannerImage));
  }

  const response = await api.post(`/api/profiles/profiles/${id}/upload-images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Fetches profile cards from the API.
 *
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the request.
 * @returns {Promise<ProfileCard[]>} A promise that resolves to an array of ProfileCard objects.
 */
export const getProfileCards = async (signal?: AbortSignal): Promise<ProfileCard[]> => {
  const response = await api.get(`api/profiles/profile-cards/`, { signal });
  return response.data.results;
};

/**
 * Updates the profile with the given ID using the provided data.
 *
 * @param id - The unique identifier of the profile to update.
 * @param data - An object containing the profile fields to update.
 * @returns A promise that resolves to the updated profile.
 */
export const createProfileCard = async (data: Partial<ProfileCardForm>): Promise<ProfileCard> => {
  const response = await api.post(`api/profiles/profile-cards/`, data);
  return response.data;
};

/**
 * Updates a profile card with the given data.
 *
 * @param id - The unique identifier of the profile card to update.
 * @param data - A partial object containing the profile card properties to update.
 * @returns A promise that resolves to the updated ProfileCard object.
 */
export const updateProfileCard = async (
  id: string,
  data: Partial<ProfileCardForm>,
): Promise<ProfileCard> => {
  const response = await api.patch(`api/profiles/profile-cards/${id}/`, data);
  return response.data;
};

/**
 * Deletes a profile card by its ID.
 *
 * @param {string} id - The ID of the profile card to delete.
 * @returns {Promise<ProfileCard>} A promise that resolves to the deleted profile card.
 */
export const deleteProfileCard = async (id: string): Promise<ProfileCard> => {
  const response = await api.delete(`api/profiles/profile-cards/${id}/`);
  return response.data;
};

/**
 * Updates the profile card image for a given profile ID.
 *
 * @param id - The unique identifier of the profile.
 * @param banner - The image data URI or null if no image is provided.
 * @returns A promise that resolves to the updated Profile object.
 */
export const updateProfileCardImage = async (
  id: string,
  banner: string | null,
): Promise<Profile> => {
  const formData = new FormData();
  if (banner) {
    formData.append("image", dataURItoBlob(banner));
  }

  const response = await api.post(`/api/profiles/profile-cards/${id}/upload-images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
