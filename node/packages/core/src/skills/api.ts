import axios, { AxiosError } from "axios";

import { PaperQAResponsePair, SemanticScholarPaper } from "../types";

const headers: { [key: string]: string } = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const isAxiosError = <ResponseType>(error: unknown): error is AxiosError<ResponseType> => {
  return axios.isAxiosError(error);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const baseURL = (globalThis as any).process?.env?.BACKEND_URL ?? "";

export const api = axios.create({ baseURL, headers });

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
  signal?: AbortSignal
): Promise<SemanticScholarPaper[]> => {
  const response = await api.get<SemanticScholarPaper[]>("api/buddies/semantic/", {
    signal,
    params: { query, fields },
    paramsSerializer: { indexes: null },
  });
  return response.data;
};

export const queryPaperQA = async (question: string): Promise<PaperQAResponsePair[]> => {
  const response = await api.post<PaperQAResponsePair[]>("api/tools/paperqa/", { question });
  return response.data;
};

export const queryPaperQACollection = async (
  collection: string,
  question: string,
  authentication: string
): Promise<PaperQAResponsePair[]> => {
  const response = await api.post<PaperQAResponsePair[]>(
    `api/tools/paperqa-collections/${collection}/query/`,
    { question },
    { headers: { Authorization: `Bearer ${authentication}` } }
  );
  console.log("PaperQACollection response", response.data);
  return response.data;
};

export const getNode = async (nodeId: string, authentication: string): Promise<string> => {
  const response = await api.get<string>(`api/nodes/nodes/${nodeId}/`, {
    headers: { Authorization: `Bearer ${authentication}` },
  });
  return response.data;
};

export const getExternalNode = async (
  nodeId: string,
  depth: number,
  authentication: string
): Promise<string> => {
  console.log("Requesting external node", nodeId, depth);
  const response = await api.get<string>(`api/nodes/nodes/${nodeId}/context/`, {
    params: { depth },
    headers: { Authorization: `Bearer ${authentication}` },
  });
  return response.data;
};
