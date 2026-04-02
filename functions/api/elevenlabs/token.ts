export async function onRequest(context: any) {
  const apiKey = context?.env?.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not set' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const body = await response.json();

    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
