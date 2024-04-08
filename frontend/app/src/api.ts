import axios, { AxiosError } from "axios";

import { BackendNode, Buddy, LLMTokenCount, Space } from "./types";

export const isAxiosError = <ResponseType>(error: unknown): error is AxiosError<ResponseType> => {
  return axios.isAxiosError(error);
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const getSpace = async (signal: AbortSignal | undefined, id?: string): Promise<Space> => {
  const response = await api.get(`api/nodes/spaces/${id}/`, { signal });
  return response.data;
};

export const updateSpace = async (
  id: string,
  data: Pick<Space, "default_node">,
): Promise<Space> => {
  const response = await api.patch(`api/nodes/spaces/${id}/`, data);
  return response.data;
};

export const getSpaceNodes = async (
  signal: AbortSignal | undefined,
  spaceId?: string,
): Promise<BackendNode[]> => {
  const response = await api.get("api/nodes/nodes/", {
    params: { spaces: spaceId },
    signal,
  });
  return response.data;
};

export const getBuddies = async (signal: AbortSignal | undefined): Promise<Buddy[]> => {
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
  buddyId: string,
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

  // Ensure counts are always 0 - 5
  const counts = response.data;
  const keys = Object.keys(counts)
    .map((key) => parseInt(key))
    .sort((a, b) => a - b);
  const lastKey = keys[keys.length - 1];
  for (let i = 0; i <= 5; i++) {
    if (counts[i] === undefined) {
      counts[i] = counts[lastKey];
    }
  }

  return response.data;
};

export const getLLMResponse = (
  abortController: AbortController,
  buddyId: string,
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
