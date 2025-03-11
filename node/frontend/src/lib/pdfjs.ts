import DOMPurify from "dompurify";
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

/**
 * Cleans HTML content by removing null characters and other problematic characters
 * @param html The HTML content to clean
 * @returns Cleaned HTML content
 */
const cleanHtmlContent = (html: string): string => {
  // eslint-disable-next-line no-control-regex
  let cleaned = html.replace(/\u0000/g, "");
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\u0001-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/\r\n|\r/g, "\n");
  return DOMPurify.sanitize(cleaned);
};

/**
 * Reads a PDF file from an ArrayBuffer and extracts its text content as an HTML formatted string.
 * @param {ArrayBuffer} arrayBuffer The ArrayBuffer containing PDF data.
 * @returns {Promise<string>} A promise that resolves to an HTML string with the extracted text content.
 */
export const readPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdfDocument: pdfjsLib.PDFDocumentProxy = await loadingTask.promise;
    let htmlContent: string = "<div>"; // Start with an HTML div container

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page: pdfjsLib.PDFPageProxy = await pdfDocument.getPage(pageNum);
      const text: pdfjsLib.TextContent = await page.getTextContent();

      let lastY: number | null = null;
      text.items.forEach((item: pdfjsLib.TextItem | pdfjsLib.TextMarkedContent, index: number) => {
        if (lastY !== null && "transform" in item && Math.abs(lastY - item.transform[5]) > 1) {
          htmlContent += "<br>";
        }
        if ("str" in item) {
          htmlContent += item.str;
        }
        lastY = "transform" in item ? item.transform[5] : lastY;

        if (text.items[index + 1] && "transform" in item && "transform" in text.items[index + 1]) {
          if (
            Math.abs(
              (text.items[index + 1] as pdfjsLib.TextItem).transform[5] - item.transform[5]
            ) <= 1
          )
            htmlContent += " ";
        }
      });

      htmlContent += "<br><br>";
    }

    htmlContent += "</div>";
    return cleanHtmlContent(htmlContent);
  } catch (error) {
    console.error("Error processing PDF: ", error);
    throw error;
  }
};

export { pdfjsLib };
