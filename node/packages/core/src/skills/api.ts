import axios, { AxiosError } from "axios";

import { PaperQAResponsePair, SemanticScholarPaper } from "../types";
import { baseURL } from "./utils";

const headers: { [key: string]: string } = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

// if (authToken) headers["Authorization"] = `Token ${authToken}`;

export const isAxiosError = <ResponseType>(error: unknown): error is AxiosError<ResponseType> => {
  return axios.isAxiosError(error);
};

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

export const queryDeepResearch = async (question: string): Promise<string> => {
  const response = await api.post<string>("api/tools/deep-research/", {
    question,
    model: "o3-mini", // or o1
    reasoning_effort: "high", // or low, medium
  });
  return response.data;
};
