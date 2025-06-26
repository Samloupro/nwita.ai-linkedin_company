import { validateApiKey } from './apiKeyValidation.js';

export default {
  async fetch(request, env, ctx) {
    // Validate the API key using KV
    const { error } = await validateApiKey(request, env);
    if (error) {
      return error;
    }
    
    // Existing logic for processing the request goes here.
    // For now, we simply return a successful response.
    return new Response("Request processed successfully", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
