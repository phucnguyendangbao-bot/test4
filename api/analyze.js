async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Missing OPENAI_API_KEY. Add it in Vercel Project Settings → Environment Variables.'
      });
    }

    // Vercel usually parses JSON into req.body, but keep a fallback for safety.
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await readBody(req);
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    }

    const { prompt } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" in request body.' });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: 'You are a strict JSON generator. Output ONLY valid JSON, no markdown, no extra text.'
            }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }]
          }
        ],
        temperature: 0.2
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || data?.error || `OpenAI error (${r.status})`;
      return res.status(r.status).json({ error: msg });
    }

    const content = (data.output_text || '').trim();
    return res.status(200).json({ content });

  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
