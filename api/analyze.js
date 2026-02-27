const https = require("https");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server chưa cấu hình API key" });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "Bạn là chuyên gia học bổng. Hãy nhận xét CV/bài luận theo cấu trúc: (1) Điểm mạnh (2) Điểm yếu (3) Gợi ý cải thiện cụ thể (4) Bản chỉnh sửa mẫu ngắn.",
      },
      { role: "user", content: prompt },
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
    let raw = "";
    response.on("data", (chunk) => (raw += chunk));
    response.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return res.status(500).json({
          error: "Invalid JSON from OpenAI",
          status: response.statusCode,
          raw: raw.slice(0, 800),
        });
      }

      // Nếu OpenAI trả lỗi, trả thẳng lỗi thật ra UI
      if (response.statusCode >= 400 || parsed.error) {
        return res.status(response.statusCode || 500).json({
          error: parsed?.error?.message || "OpenAI error",
          status: response.statusCode,
          type: parsed?.error?.type,
          code: parsed?.error?.code,
        });
      }

      const content = parsed?.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          error: "No content returned",
          status: response.statusCode,
          debug: {
            hasChoices: Array.isArray(parsed?.choices),
            firstChoiceKeys: parsed?.choices?.[0] ? Object.keys(parsed.choices[0]) : null,
          },
        });
      }

      return res.status(200).json({ content });
    });
  });

  request.on("error", (err) => {
    return res.status(500).json({ error: err.message });
  });

  request.write(body);
  request.end();
};
