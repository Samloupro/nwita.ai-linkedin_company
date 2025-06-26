import detectErrorType from './errorDetector.js';

/**
 * retryFetch - Exécute une requête fetch avec une logique de retry en cas d'erreur (ex: HTTP 429 ou erreur réseau)
 * avec un délai exponentiel entre chaque tentative.
 *
 * @param {string} url - L'URL de la requête à exécuter.
 * @param {object} [options={}] - Options pour fetch.
 * @param {number} [maxRetries=5] - Nombre maximum de tentatives.
 * @param {number} [delay=500] - Délai initial en millisecondes.
 * @returns {Promise<Response>} - Promesse qui résout avec la réponse ou rejette avec un objet d'erreur contenant un type.
 */
function retryFetch(url, options = {}, maxRetries = 10, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attemptFetch = (attempt) => {
      fetch(url, options)
        .then(response => {
          if (!response.ok && response.status === 429) {
            if (attempt < maxRetries) {
              setTimeout(() => {
                attemptFetch(attempt + 1);
              }, delay * Math.pow(2, attempt));
            } else {
            console.error("Request blocked: type", detectErrorType(new Error("Request blocked (HTTP 429)"), response));
            reject({
              error: new Error("Request blocked (HTTP 429)"),
              type: detectErrorType(new Error("Request blocked (HTTP 429)"), response)
            });
            }
          } else {
            resolve(response);
          }
        })
        .catch(error => {
          if (attempt < maxRetries) {
            setTimeout(() => {
              attemptFetch(attempt + 1);
            }, delay * Math.pow(2, attempt));
          } else {
            console.error("Fetch error detected: type", detectErrorType(error));
            reject({
              error,
              type: detectErrorType(error)
            });
          }
        });
    };
    attemptFetch(0);
  });
}

export default retryFetch;
