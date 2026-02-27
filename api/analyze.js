const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "Server chưa cấu hình API key" });

  const { prompt } = req.body || {};
  if (!prompt)
    return res.status(400).json({ error: "Missing prompt" });

  const body = JSON.stringify({
    model: "openai/gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "Bạn là chuyên gia học bổng. Hãy phân tích CV theo cấu trúc: Điểm mạnh, Điểm yếu, Gợi ý cải thiện."
      },
      { role: "user", content: prompt }
    ]
  });

  const options = {
    hostname: "openrouter.ai",
    path: "/api/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://test4.vercel.app",
      "X-Title": "BrightWay CV Review"
    }
  };

  const request = https.request(options, (response) => {
    let data = "";
    response.on("data", chunk => data += chunk);
    response.on("end", () => {
      const parsed = JSON.parse(data);

      if (parsed.error) {
        return res.status(500).json({ error: parsed.error.message });
      }

      const content = parsed.choices?.[0]?.message?.content;
      if (!content)
        return res.status(500).json({ error: "No content returned" });

      res.status(200).json({ content });
    });
  });

  request.on("error", err => {
    res.status(500).json({ error: err.message });
  });

  request.write(body);
  request.end();
};
