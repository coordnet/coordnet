import axios, { AxiosError } from "axios";

import { SemanticScholarPaper } from "../types";
import { PaperQAResponse } from "./paperQA";
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

export const queryPaperQA = async (question: string): Promise<PaperQAResponse> => {
  const response = await api.post<PaperQAResponse>("api/tools/paperqa/", { question });
  return response.data;
};
