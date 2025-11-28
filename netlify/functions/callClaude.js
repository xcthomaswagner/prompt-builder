/**
 * Netlify Function: Claude API Proxy
 * Avoids Cloudflare browser verification by making server-side requests
 */
export default async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { prompt, systemInstruction, modelId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || "Anthropic API error" 
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: "No response from Claude" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Parse and return JSON
    try {
      const parsed = JSON.parse(text);
      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      return new Response(JSON.stringify({ raw: text }), {
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/claude"
};
