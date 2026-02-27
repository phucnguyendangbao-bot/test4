const https = require('https');

module.exports = async function handler(req, res) {
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
    max_tokens: 1500,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Bạn là chuyên gia tư vấn học bổng. Chỉ trả về JSON thuần, không có text khác.'
      },
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
        'X-Title': 'BrightWay Scholars CV Review'
      }
    };

    const reqOut = https.request(options, (resOut) => {
      let data = '';
      resOut.on('data', chunk => data += chunk);
      resOut.on('end', () => {
        try {
          res.status(resOut.statusCode).json(JSON.parse(data));
        } catch {
          res.status(500).json({ error: 'Invalid response', raw: data.slice(0, 300) });
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
};
