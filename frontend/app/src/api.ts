import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import store from "store2";

import {
  ApiError,
  BackendNode,
  Buddy,
  LLMTokenCount,
  Me,
  NodeVersion,
  PaginatedApiResponse,
  Permission,
  PermissionModel,
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

export const api = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL, headers });
export const authApi = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL, headers });

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
      store.remove("coordnet-auth");
      window.location.href = "/auth/login";
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

  // Filter out public spaces for now
  if (response.data.count !== 0) {
    return {
      ...response.data,
      results: response.data.results.filter((space: Space) => !space.is_public),
    };
  }
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
): Promise<BackendNode> => {
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

export const getNodeVersions = async (
  signal: AbortSignal | undefined,
  document?: string,
  document_type: string = "GRAPH",
  page: number = 1,
  page_size: number = 100,
): Promise<PaginatedApiResponse<NodeVersion>> => {
  const response = await api.get("api/nodes/versions/", {
    params: { document, document_type, page, page_size },
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

export const getLLMResponse = (
  abortController: AbortController,
  buddyId: string | undefined,
  message: string,
  nodes: string[],
  level: number,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: { [key: string]: Array<(data?: any) => void> } = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function on(eventName: string, listener: (data?: any) => void): void {
    events[eventName] = events[eventName] || [];
    events[eventName].push(listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emit(eventName: string, data?: any): void {
    if (events[eventName]) {
      events[eventName].forEach((listener) => listener(data));
    }
  }

  (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/buddies/${buddyId}/query/`,
        {
          method: "post",
          signal: abortController.signal,
          body: JSON.stringify({ message, nodes, level }),
          headers: { "Content-Type": "application/json", "Accept-Encoding": "in" },
        },
      );
      if (response.body === null) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          emit("end");
          break;
        }
        const decoded = decoder.decode(value, { stream: true });
        emit("data", decoded);
      }
    } catch (error) {
      emit("error", error);
    }
  })();

  return { on };
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
