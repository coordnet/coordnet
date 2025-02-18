// Define some types for the CDN loaded pdf.js library
declare module "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs" {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getTextContent: () => Promise<TextContent>;
  }

  export interface TextContent {
    items: Array<TextItem | TextMarkedContent>;
  }

  export interface TextItem {
    str: string;
    transform: number[];
  }

  export type TextMarkedContent = TextItem;

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(params: { data: ArrayBuffer }): {
    promise: Promise<PDFDocumentProxy>;
  };

  export const version: string;
}
