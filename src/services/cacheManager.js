export async function checkCache(url, requestHeaders) { // requestHeaders is no longer needed for cacheKey, but kept for function signature consistency
  const cacheKey = new Request(url);
  const cachedResponse = await caches.default.match(cacheKey);
  return { cachedResponse, cacheKey };
}

export async function storeCache(cacheKey, response) {
  await caches.default.put(cacheKey, response.clone(), { expirationTtl: 2592000 });
  console.log("Response cached for URL:", cacheKey.url);
}
