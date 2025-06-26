export function extractJsonLd(html) {
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  let jsonLd = {};
  if (jsonLdMatch) {
    try {
      jsonLd = JSON.parse(jsonLdMatch[1]);
    } catch (e) {
      return {
        error: new Response(JSON.stringify({ error: "Invalid JSON-LD format" }), { status: 400 })
      };
    }
  }
  return { jsonLd };
}

export function getOrganizationData(jsonLd) {
  const organization = jsonLd['@graph']?.find(item => item['@type'] === 'Organization');
  if (!organization) {
    return {
      error: new Response(JSON.stringify({ error: "Company data not found" }), { status: 404 })
    };
  }
  return { organization };
}
