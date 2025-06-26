/**
 * detectErrorType - Analyse l'erreur et éventuellement la réponse pour déterminer le type d'erreur
 *
 * Cette fonction renvoie une chaîne décrivant le type d'erreur rencontré lors d'un appel fetch.
 * Par exemple, si la réponse indique un statut 429, on considère qu'il s'agit d'un blocage.
 * Si l'erreur ou son message indique un délai dépassé (timeout) ou si l'erreur possède le nom "AbortError",
 * la fonction renvoie "timeout". Pour des problèmes liés au réseau, elle renvoie "network error".
 * Dans les autres cas, elle renvoie "unknown error".
 *
 * @param {Error} error - L'erreur capturée lors de l'appel fetch.
 * @param {Response} [response] - La réponse fetch obtenue (facultatif).
 * @returns {string} - Le type d'erreur ("blockage", "timeout", "network error", ou "unknown error").
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
