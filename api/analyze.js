const https = require("https");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server chưa cấu hình API key" });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const body = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Bạn là chuyên gia học bổng. Hãy phân tích CV và trả về nhận xét chi tiết, rõ ràng, có cấu trúc.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

   response.on("end", () => {
  try {
    const parsed = JSON.parse(data);

    console.log("FULL RESPONSE:", parsed);

    let content = null;

    if (parsed.choices && parsed.choices.length > 0) {
      if (parsed.choices[0].message) {
        content = parsed.choices[0].message.content;
      } else if (parsed.choices[0].text) {
        content = parsed.choices[0].text;
      }
    }

    if (!content) {
      return res.status(500).json({
        error: "No content returned",
        debug: parsed
      });
    }

    res.status(200).json({ content });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
