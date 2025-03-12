import { Request } from "express";

import { db } from "./db";
import { settings } from "./settings";

export const getDocumentType = (name: string) => {
  if (name.startsWith("space-")) {
    return "SPACE";
  } else if (name.startsWith("method-run-")) {
    return "SKILL_RUN";
  } else if (name.startsWith("method-")) {
    return "SKILL";
  } else if (name.startsWith("node-graph-")) {
    return "CANVAS";
  } else if (name.startsWith("node-editor-")) {
    return "EDITOR";
  }
};

export const cleanDocumentName = (name: string) => {
  return name.replace(/^(node-graph-|space-|node-editor-|method-run-|method-)/, "");
};

export const backendRequest = (path: string, token?: string) => {
  const headers: { [key: string]: string } = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }
  return fetch(`${settings.BACKEND_URL}/${path}`, { headers });
};

export const authRequest = (request: Request) => {
  return (
    settings.WEBSOCKET_API_KEY &&
    settings.WEBSOCKET_API_KEY !== "" &&
    request.header("Authorization") === `Token ${settings.WEBSOCKET_API_KEY}`
  );
};

// Add this function at the top of your file
export const waitForSkillData = async (
  methodId: string,
  maxRetries = 30,
  retryIntervalMs = 1000
): Promise<{ [k: string]: unknown }> => {
  let retries = 0;

  while (retries < maxRetries) {
    const version = await db("nodes_methodnodeversion")
      .where("method_id", methodId)
      .orderBy("version", "desc")
      .first();

    if (version?.method_data) {
      console.log(`Found skill data after ${retries} retries`);
      return version.method_data;
    }

    console.log(
      `Skill data not found yet, retrying in ${retryIntervalMs}ms (${retries + 1}/${maxRetries})`
    );
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    retries++;
  }

  throw new Error("Could not find skill data after maximum retries");
};
