export async function processRequest(request) {
  let url;
  let useCache = true; // Default to true: use cache

  if (request.method === "POST") {
    const body = await request.json();
    url = body.url;
    // If 'cache' is explicitly false in the body, then disable cache
    if (body.cache === false) {
      useCache = false;
    }
  } else {
    return {
      error: new Response(JSON.stringify({ error: "Only POST requests are allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  if (!url) {
    return {
      error: new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  url = encodeURI(url);
  return { url, useCache }; // Return URL and useCache flag
}
