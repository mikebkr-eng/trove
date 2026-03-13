export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { query, chips, tasteProfile, discover, locale } = body;
    const country = locale?.country || "Canada";
    const currency = locale?.currency || "CAD";
    const countryCode = locale?.countryCode || "CA";
    const storesByCountry = {
      CA: "Etsy, MEC, Sport Chek, Indigo, Williams-Sonoma, Hudson's Bay, Simons, Patagonia Canada",
      US: "Etsy, REI, Williams Sonoma, Nordstrom, Uncommon Goods, Sur La Table, Patagonia",
      GB: "Etsy, John Lewis, Marks & Spencer, ASOS, Selfridges, Lakeland",
      AU: "Etsy, Myer, David Jones, Kathmandu, Cotton On, Patagonia Australia",
      NZ: "Etsy, Kathmandu, Farmers, Macpac",
      DE: "Etsy, Zalando, About You, Otto",
      FR: "Etsy, Fnac, Galeries Lafayette, Decathlon",
    };
    const stores = storesByCountry[countryCode] || storesByCountry["CA"];

    const cats = tasteProfile?.topCategories?.slice(0,3).join(", ") || "";
    const tags = tasteProfile?.topTags?.slice(0,4).join(", ") || "";
    const liked = tasteProfile?.likedProducts?.slice(0,2).join(", ") || "";
    const profileContext = tasteProfile?.scanCount > 0
      ? `User likes: ${cats}. Values: ${tags}.${liked ? ` Liked: ${liked}.` : ""}`
      : "";
    const categoryContext = chips?.length > 0 ? `Categories: ${chips.slice(0,3).join(", ")}.` : "";

    const searchPrompt = discover
      ? `Personal shopping curator for ${country}. Find 5 exciting products the user would love from: ${stores}. ${profileContext} ${categoryContext} Prices in ${currency}. Products available in ${country}.`
      : `Shopping assistant for ${country}. Find 5 products for: "${query}". ${categoryContext} ${profileContext} From: ${stores}. Vary stores. Prices in ${currency}. Available in ${country}.`;

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
      "price": "price in local currency e.g. CAD 49.99 or USD 39.99",
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
