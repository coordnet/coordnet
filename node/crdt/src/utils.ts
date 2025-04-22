import Worker from "@prd-thanhnguyenhoang/celery.node/dist/app/worker";

import { settings } from "./settings";
import { AMQPBrokerWithChannel } from "./types";

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
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${settings.BACKEND_URL}/${path}`, { headers });
};

export const setWorkerPrefetch = (worker: Worker) => {
  const broker = worker.broker as AMQPBrokerWithChannel;

  if (broker.channel && typeof broker.channel.then === "function") {
    broker.channel = broker.channel.then(async (ch) => {
      await ch.prefetch(1);
      console.log(`[AMQPBroker] Prefetch set to 1`);
      return ch;
    });
  } else {
    console.log("Broker is not RabbitMQ (AMQP), skipping prefetch patch.");
  }
};
