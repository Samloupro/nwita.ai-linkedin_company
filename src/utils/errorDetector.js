/**
 * detectErrorType - Analyzes the error and optionally the response to determine the error type.
 *
 * This function returns a string describing the type of error encountered during a fetch call.
 * For example, if the response indicates a 429 status, it's considered a "blockage".
 * If the error or its message indicates a timeout or if the error has the name "AbortError",
 * the function returns "timeout". For network-related issues, it returns "network error".
 * In other cases, it returns "unknown error".
 *
 * @param {Error} error - The error captured during the fetch call.
 * @param {Response} [response] - The fetch response obtained (optional).
 * @returns {string} - The error type ("blockage", "timeout", "network error", or "unknown error").
 */
function detectErrorType(error, response) {
  if (response && response.status === 429) {
    return "blockage";
  }
  if (error) {
    const msg = error.message.toLowerCase();
    if (error.name === "AbortError" || msg.includes("timeout")) {
      return "timeout";
    }
    if (msg.includes("network")) {
      return "network error";
    }
  }
  return "unknown error";
}

export default detectErrorType;
