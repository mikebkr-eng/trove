export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { query, chips, tasteProfile, discover, locale } = body;

    const country = locale?.country || "Canada";
    const currency = locale?.currency || "CAD";
    const countryCode = locale?.countryCode || "CA";

    const storesByCountry = {
      CA: "MEC, Sport Chek, Atmosphere, Sporting Life, Patagonia Canada, Arc'teryx, Etsy, Bass Pro, Blacks Outdoors, Altitude Sports",
      US: "REI, Backcountry, Moosejaw, EMS, Patagonia, Arc'teryx, Etsy, Cabela's, Bass Pro, Steep & Cheap",
      GB: "Cotswold Outdoor, Snow + Rock, Ellis Brigham, Go Outdoors, Blacks, Millets, Etsy",
      AU: "Paddy Pallin, Anaconda, Kathmandu, Macpac, Snowgum, Etsy",
      NZ: "Macpac, Kathmandu, Bivouac Outdoor, Etsy",
    };
    const stores = storesByCountry[countryCode] || storesByCountry["CA"];

    const cats = tasteProfile?.topCategories?.slice(0,3).join(", ") || "";
    const tags = tasteProfile?.topTags?.slice(0,4).join(", ") || "";
    const profileContext = tasteProfile?.scanCount > 0
      ? `User interest areas: ${cats}. Values: ${tags}.` : "";
    const categoryContext = chips?.length > 0 ? `Categories: ${chips.slice(0,3).join(", ")}.` : "";

    const searchPrompt = discover
      ? `Personal shopping curator for ${country}. Find 5 exciting products from: ${stores}. ${profileContext} ${categoryContext} Prices in ${currency}. Real products available in ${country}.`
      : `You are a shopping assistant for ${country}. The user is searching for: "${query}". 
Search specifically for this product. Look across these stores: ${stores} — and also any other specialty retailers that carry this type of product in ${country}.
${categoryContext} ${profileContext}
Find 4-5 specific real products with real prices in ${currency}. If mainstream stores don't carry it, look at specialty retailers, direct brand websites, or Etsy. Always return results even for niche products.`;

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
          { role: "assistant", content: [{ type: "text", text: "I'll search for those products now." }] },
          {
            role: "user",
            content: `Output ONLY raw JSON starting with { and ending with }, no markdown:
{
  "products": [
    {
      "name": "Exact Product Name",
      "store": "Store Name",
      "price": "price in ${currency}",
      "priceSub": "short note e.g. free shipping, limited stock",
      "why": "1-2 sentences on why this is a great pick",
      "matchReason": true,
      "url": "https://real-product-url.com",
      "tags": ["tag1", "tag2"]
    }
  ]
}
Include 4-5 products. Use real direct URLs. If you can't find a specific product page, link to the search results page for that store. Never return an empty products array — always find something relevant.`
          }
        ]
      })
    });

    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: "Search failed — " + (d?.error?.message || "please try again") });

    const text = d.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return res.status(500).json({ error: "No products found for that search. Try rephrasing — e.g. 'ice climbing gear' or 'mountaineering crampons'." });

    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (!parsed.products?.length) {
        return res.status(200).json({ products: [], message: "No results found. Try a broader search term." });
      }
      return res.status(200).json(parsed);
    } catch {
      return res.status(500).json({ error: "Could not read results. Please try again." });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
