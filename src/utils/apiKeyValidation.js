export async function validateApiKey(request, env) {
  const rawApiKey = request.headers.get('Authorization')?.trim() || '';
  if (!rawApiKey) {
    return {
      error: new Response(
        JSON.stringify([{ error: 'Missing Authorization header' }]),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
  try {
    if (!env.KV_API_KEYS) {
      return {
        error: new Response(
          JSON.stringify([{ error: 'KV not configured' }]),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    const apiKeyExists = await env.KV_API_KEYS.get(rawApiKey);
    if (!apiKeyExists) {
      return {
        error: new Response(
          JSON.stringify([{ error: 'Invalid API key' }]),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
  } catch (e) {
    console.error('KV store error:', e);
    return {
      error: new Response(
        JSON.stringify([{ error: 'Internal server error' }]),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
  return { rawApiKey };
}
