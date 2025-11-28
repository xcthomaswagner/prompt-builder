const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// Define secret for Anthropic API key (set via: firebase functions:secrets:set ANTHROPIC_API_KEY)
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

/**
 * Proxy for Anthropic Claude API calls
 * Avoids Cloudflare browser verification by making server-side requests
 */
exports.callClaude = onRequest(
  { 
    cors: true,
    secrets: [anthropicApiKey]
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { prompt, systemInstruction, modelId } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey.value(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: modelId || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: (systemInstruction || "") + "\n\nIMPORTANT: You must return valid JSON only.",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Anthropic API error:", errorData);
        return res.status(response.status).json({ 
          error: errorData.error?.message || "Anthropic API error" 
        });
      }

      const data = await response.json();
      const text = data.content?.[0]?.text;

      if (!text) {
        return res.status(500).json({ error: "No response from Claude" });
      }

      // Parse and return JSON
      try {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch {
        // Return raw text if not valid JSON
        return res.json({ raw: text });
      }

    } catch (error) {
      console.error("Function error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
);
