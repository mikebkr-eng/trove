
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { query, chips, tasteProfile, discover } = body;

    // Build context string from taste profile
    const profileContext = tasteProfile ? `
User taste profile:
- Top categories: ${tasteProfile.topCategories?.join(", ") || "unknown"}
- Things they look for: ${tasteProfile.topTags?.join(", ") || "unknown"}
- Products they liked: ${tasteProfile.likedProducts?.join(", ") || "none yet"}
- Products they disliked: ${tasteProfile.dislikedProducts?.join(", ") || "none yet"}
- Total scans: ${tasteProfile.scanCount || 0}
` : "No taste profile yet — suggest interesting products across categories.";

    const categoryContext = chips?.length > 0
      ? `Focus on these categories: ${chips.join(", ")}.`
      : "";

    const searchPrompt = discover
      ? `You are a personal shopping curator. Based on this user's taste profile, discover 5-6 exciting products they would genuinely love but might not have found on their own. Prioritize unique, quality products from specialty stores like Etsy, REI, Patagonia, MEC, Williams Sonoma, Sur La Table, Indigo, Nordstrom, Uncommon Goods, and other quality retailers. Avoid generic Amazon basics.

${profileContext}
${categoryContext}

Search for specific real products with real prices. Focus on discovery — things that are interesting, well-made, and match their taste.`
      : `You are a personal shopping assistant. Search for products matching: "${query}". ${categoryContext}

${profileContext}

Find 5-6 specific real products from a variety of quality stores including Etsy, REI, Patagonia, MEC, Williams Sonoma, Sur La Table, Indigo, Nordstrom, Canadian Tire, Sport Chek, Uncommon Goods, and other relevant retailers. Avoid showing only Amazon results — prioritize interesting and specialty stores.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          { role: "user", content: searchPrompt },
          { role: "assistant", content: [{ type: "text", text: "I'll search for the best products for this user." }] },
          {
            role: "user",
            content: `Output ONLY a raw JSON object starting with { and ending with }, no markdown, no backticks:
{
  "products": [
    {
      "name": "Product Name",
      "store": "Store Name",
      "price": "$XX.XX",
      "priceSub": "optional note like 'free shipping' or 'handmade'",
      "why": "1-2 sentences on why this matches the user specifically",
      "matchReason": true,
      "url": "https://direct-product-url.com",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}
Include 5-6 products. Use real URLs. Vary the stores — don't repeat the same store more than twice.`
          }
        ]
      })
    });

    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: "Search failed: " + JSON.stringify(d?.error) });

    const text = d.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return res.status(500).json({ error: "No products found. Try a different search." });

    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      return res.status(200).json(parsed);
    } catch {
      return res.status(500).json({ error: "Could not read results. Please try again." });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
