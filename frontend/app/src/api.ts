import axios, { AxiosError } from "axios";

import { Space } from "./types";

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

export const getSpace = async (
  signal: AbortSignal | undefined,
  spaceId?: string,
): Promise<Space> => {
  const response = await api.get(`api/nodes/spaces/${spaceId}/`, { signal });
  return response.data;
};
