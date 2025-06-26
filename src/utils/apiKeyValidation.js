export async function validateApiKey(request, env) {
  const rawApiKey = request.headers.get('Authorization')?.trim() || '';
  if (!rawApiKey) {
    return {
      error: new Response(
        JSON.stringify([{ erreur: 'Entête Authorization manquant' }]),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
  try {
    if (!env.KV_API_KEYS) {
      return {
        error: new Response(
          JSON.stringify([{ erreur: 'KV non configuré' }]),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    const apiKeyExists = await env.KV_API_KEYS.get(rawApiKey);
    if (!apiKeyExists) {
      return {
        error: new Response(
          JSON.stringify([{ erreur: 'Clé API invalide' }]),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
  } catch (e) {
    console.error('KV store error:', e);
    return {
      error: new Response(
        JSON.stringify([{ erreur: 'Erreur interne du serveur' }]),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
  return { rawApiKey };
}
