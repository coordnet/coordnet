import axios from "axios";
import {
  applyAuthTokenInterceptor,
  clearAuthTokens,
  refreshTokenIfNeeded,
  TokenRefreshRequest,
} from "axios-jwt";
import { toast } from "sonner";

import { apiUrl } from "../constants";

export const api = axios.create({
  baseURL: apiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const authApi = axios.create({
  baseURL: apiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const requestRefresh: TokenRefreshRequest = async (refreshToken: string): Promise<string> => {
  const response = await axios.post(`${apiUrl}/api/auth/jwt/refresh/`, {
    refresh: refreshToken,
  });

  return response.data.access;
};

applyAuthTokenInterceptor(api, { requestRefresh });
applyAuthTokenInterceptor(authApi, { requestRefresh });

export const logout = (): void => {
  clearAuthTokens();
  window.location.href = "/auth/login";
};

export const getToken = async () => {
  console.log("getToken called");
  try {
    return (await refreshTokenIfNeeded(requestRefresh)) as string;
  } catch (error) {
    console.error("Error getting token:", error);
    return "public";
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
      return;
    }
    console.log(error);
    if (!error.response) {
      toast.error(error.message);
    }

    // If auth error and not a login request, redirect to login
    if (!error?.response?.config?.url?.includes("auth/jwt/") && error.response?.status === 401) {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      const loginUrl = `/auth/login?redirect=${currentUrl}`;
      logout();
      window.location.href = loginUrl;
    }

    return Promise.reject(error);
  }
);

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
      return;
    }
    if (!error.response) {
      toast.error(error.message);
    }
    return Promise.reject(error);
  }
);
