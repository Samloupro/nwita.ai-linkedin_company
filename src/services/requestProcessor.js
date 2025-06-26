export async function processRequest(request) {
  let url;
  if (request.method === "POST") {
    const { url: bodyUrl } = await request.json();
    url = bodyUrl;
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
  return { url };
}
