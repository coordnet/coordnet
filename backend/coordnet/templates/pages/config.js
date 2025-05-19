window.__COORDNET_CONFIG__ = {
  apiUrl: "{{ api_url }}",
  websocketUrl: "{{ websocket_url }}",
  crdtUrl: "{{ crdt_url }}",
  availableLLMs: {{ available_llms | safe }},
}
