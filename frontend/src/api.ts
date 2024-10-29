import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import store from "store2";

import { apiUrl } from "./constants";
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
    params: { spaces: spaceId, limit: 10000 },
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
