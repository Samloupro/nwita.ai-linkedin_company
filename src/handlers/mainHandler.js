import { validateApiKey } from '../utils/apiKeyValidation.js';
import { processRequest } from '../services/requestProcessor.js';
import { checkCache, storeCache } from '../services/cacheManager.js';
import { scrapeCompanyData } from '../services/linkedinScraper.js';
import { formatCompanyResponse } from '../services/responseFormatter.js'; // New import

export default {
  async fetch(request, env, ctx) {
    // Validate the API key using KV
    const { error: apiKeyError } = await validateApiKey(request, env);
    if (apiKeyError) {
      return apiKeyError;
    }

    // Process request and extract URL and cache flag
    const { url, useCache, error: requestError } = await processRequest(request);
    if (requestError) {
      return requestError;
    }

    let cachedResponse = null;
    let cacheKey = null;

    if (useCache) { // If useCache is true, we check the cache
        const cacheResult = await checkCache(url, request.headers);
        cachedResponse = cacheResult.cachedResponse;
        cacheKey = cacheResult.cacheKey;

        if (cachedResponse) {
            console.log(`Cache HIT for URL: ${url}`);
            return cachedResponse; // Return cached response if it exists
        } else {
            console.log(`Cache MISS for URL: ${url}`);
        }
    } else {
        console.log(`Cache BYPASSED for URL: ${url}`);
    }

    try {
      console.log(`Initiating data scraping for URL: ${url}`);
      // Scrape company data
      const { error: scrapeError, ...scrapedData } = await scrapeCompanyData(url, request.headers, env);
      if (scrapeError) {
        return scrapeError;
      }

      // Format the scraped data into the final response structure
      const finalResult = formatCompanyResponse(scrapedData);

      const finalResponse = new Response(JSON.stringify([finalResult], null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      // Store response in cache, only if useCache is true
      if (useCache) {
        storeCache(cacheKey, finalResponse.clone(), ctx); // Pass ctx here
      }

      return finalResponse;
    } catch (error) {
      console.error("Worker error:", error, error.type ? "Type: " + error.type : "");
      return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
      });
    }
  }
};
