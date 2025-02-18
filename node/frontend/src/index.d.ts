export {};

declare global {
  interface Window {
    __COORDNET_CONFIG__: {
      apiUrl: string;
      websocketUrl: string;
      crdtUrl: string;
    };
  }
}
