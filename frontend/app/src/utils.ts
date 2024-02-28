/*
 * Get a string representation of an error, whether it is a string, an Error instance, or an object
 * @param error - The error to get a string representation of
 * @returns A string representation of the error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getErrorMessage = (error: any): string => {
  if (typeof error === "string") {
    return error;
  }

  // Check if error is an instance of Error
  if (error instanceof Error) {
    return error.message;
  }

  // Handle error objects (like from API responses)
  const errorObj: { statusText?: string; message?: string } = error;
  if (errorObj?.statusText) {
    return errorObj.statusText;
  }
  if (errorObj?.message) {
    return errorObj.message;
  }

  // Attempt to stringify the error if it is an object
  try {
    const errorString = JSON.stringify(error, null, 2);
    // Avoid returning empty or non-informative strings
    if (errorString && errorString !== "{}" && errorString !== '""') {
      return errorString;
    }
  } catch {
    // Fallback in case of JSON.stringify failure
  }

  return `An error occurred: ${String(error)}`;
};
