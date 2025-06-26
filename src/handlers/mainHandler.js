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

    // Process request and extract URL
    const { url, error: requestError } = await processRequest(request);
    if (requestError) {
      return requestError;
    }

    // Check cache for existing response
    const { cachedResponse, cacheKey } = await checkCache(url, request.headers);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
      // Scrape company data
      const { result: scrapedData, error: scrapeError } = await scrapeCompanyData(url, request.headers, env);
      if (scrapeError) {
        return scrapeError;
      }

      // Format the scraped data into the final response structure
      const finalResult = formatCompanyResponse(scrapedData);

      const finalResponse = new Response(JSON.stringify([finalResult], null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      // Store response in cache
      await storeCache(cacheKey, finalResponse.clone());

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
