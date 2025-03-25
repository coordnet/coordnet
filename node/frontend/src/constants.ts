export const nodeColors = [
  { value: "None", color: "" },
  { value: "Purple", color: "#5B28CE" },
  { value: "Blue", color: "#336EF3" },
  { value: "Light Blue", color: "#54BFF9" },
  { value: "Green", color: "#76CA48" },
  { value: "Aqua", color: "#8ADFCD" },
  { value: "Red", color: "#EA6441" },
  { value: "Orange", color: "#F2A33A" },
  { value: "Yellow", color: "#F9DE4B" },
  { value: "Pink", color: "#E955D8" },
  { value: "Brown", color: "#B0693A" },
];

export const ALLOWED_TAGS = ["a", "b", "strong", "i", "em", "strike", "u"];
export const FORBID_ATTR = ["style"];

export const websocketUrl =
  window.__COORDNET_CONFIG__ && window.__COORDNET_CONFIG__.websocketUrl
    ? window.__COORDNET_CONFIG__.websocketUrl
    : import.meta.env.VITE_BACKEND_WS_URL;

export const apiUrl =
  window.__COORDNET_CONFIG__ && window.__COORDNET_CONFIG__.apiUrl
    ? window.__COORDNET_CONFIG__.apiUrl
    : import.meta.env.VITE_BACKEND_URL;

export const crdtUrl =
  window.__COORDNET_CONFIG__ && window.__COORDNET_CONFIG__.crdtUrl
    ? window.__COORDNET_CONFIG__.crdtUrl
    : import.meta.env.VITE_CRDT_URL;
