const https = require('https');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server chưa cấu hình API key' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const bodyStr = JSON.stringify({
    model: 'openai/gpt-4o-mini',
    max_tokens: 1200,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Chuyên gia học bổng. Trả về JSON ngắn gọn.' },
      { role: 'user', content: prompt }
    ]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://brightway-scholars.vercel.app',
        'X-Title': 'BrightWay CV Review'
      }
    };

    const reqOut = https.request(options, (resOut) => {
      const chunks = [];
      resOut.on('data', chunk => chunks.push(chunk));
      resOut.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const parsed = JSON.parse(raw);
          const content = parsed.choices?.[0]?.message?.content;
          if (!content) {
            return res.status(500).json({ error: 'No content', debug: raw.slice(0, 400) }), resolve();
          }
          res.status(200).json({ content });
        } catch (e) {
          res.status(500).json({ error: e.message, raw: raw.slice(0, 400) });
        }
        resolve();
      });
    });

    reqOut.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    reqOut.write(bodyStr);
    reqOut.end();
  });
}

handler.config = {
  api: { responseLimit: false }
};

module.exports = handler;
