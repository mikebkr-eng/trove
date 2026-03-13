export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { query, chips, tasteProfile, discover, locale, priceFilter } = body;

    if (!query && !discover) return res.status(400).json({ error: "No query provided" });

    const country = locale?.country || "Canada";
    const currency = locale?.currency || "CAD";
    const countryCode = locale?.countryCode || "CA";

    const storesByCountry = {
      CA: "MEC, Sport Chek, Atmosphere, Sporting Life, Patagonia Canada, Arc'teryx, Etsy, Altitude Sports, Indigo, Hudson's Bay",
      US: "REI, Backcountry, Moosejaw, EMS, Patagonia, Arc'teryx, Etsy, Cabela's, Steep & Cheap, Nordstrom",
      GB: "Cotswold Outdoor, Snow + Rock, Ellis Brigham, Go Outdoors, John Lewis, Etsy, ASOS",
      AU: "Paddy Pallin, Anaconda, Kathmandu, Macpac, Myer, David Jones, Etsy",
      NZ: "Macpac, Kathmandu, Bivouac Outdoor, Farmers, Etsy",
      DE: "Etsy, Zalando, About You, Otto, Globetrotter",
      FR: "Etsy, Fnac, Galeries Lafayette, Decathlon, La Redoute",
    };
    const stores = storesByCountry[countryCode] || storesByCountry["CA"];

    const p = tasteProfile?.profile || {};
    const cats = tasteProfile?.topCategories?.slice(0,3).join(", ") || "";
    const tags = tasteProfile?.topTags?.slice(0,4).join(", ") || "";
    const liked = tasteProfile?.likedProducts?.slice(0,2).join(", ") || "";

    const profileParts = [
      cats ? `interests: ${cats}` : "",
      tags ? `values: ${tags}` : "",
      liked ? `liked: ${liked}` : "",
      p.vibes?.length ? `vibes: ${p.vibes.join(", ")}` : "",
      p.budget ? `budget style: ${p.budget}` : "",
      p.interests ? `into: ${p.interests}` : "",
      p.avoid ? `avoid: ${p.avoid}` : "",
    ].filter(Boolean).join(". ");

    const profileContext = profileParts || "no profile yet, suggest interesting varied products";
    const categoryContext = chips?.length > 0 ? `Focus on: ${chips.slice(0,3).join(", ")}.` : "";
    const priceContext = priceFilter === 50 ? `Under ${currency} 50 only.`
      : priceFilter === 150 ? `Between ${currency} 50-150 only.`
      : priceFilter === 300 ? `Between ${currency} 150-300 only.`
      : priceFilter === 999 ? `${currency} 300+ premium only.`
      : "";

    const searchPrompt = discover
      ? `You are a personal shopping curator for ${country}. Profile: ${profileContext}. ${categoryContext} ${priceContext} Find 5 interesting products from: ${stores}. Prices in ${currency}. Real products available in ${country}.`
      : `You are a shopping assistant for ${country}. Find products for: "${query}". ${categoryContext} ${profileContext ? `User profile: ${profileContext}.` : ""} ${priceContext} Search: ${stores} and any other relevant specialty retailers in ${country}. Prices in ${currency}. Always return results even for niche items.`;

    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
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
              content: `Return ONLY a raw JSON object. No markdown. No backticks. Start with { end with }.

Format:
{"angle":"one warm casual line about what angle you took e.g. For the outdoorsy side of you or Something for the home cook in you — only for discover mode, use empty string for search","products":[{"name":"Product Name","store":"Store Name","price":"${currency} XX.XX","priceSub":"e.g. free shipping","rating":"4.7","why":"why this suits the user in 1-2 sentences","matchReason":true,"url":"https://url.com","tags":["tag1","tag2"]}]}

Rules: 4-5 products. Real URLs. Vary stores. Rating only if found. Empty string for angle if search mode.`
            }
          ]
        })
      });
    } catch (fetchErr) {
      return res.status(502).json({ error: "Could not reach search service. Please try again." });
    }

    let d;
    const rawText = await r.text();
    try { d = JSON.parse(rawText); } catch {
      return res.status(502).json({ error: "Service error — please try again." });
    }
    if (!r.ok) return res.status(502).json({ error: d?.error?.message || "Search failed, please try again." });

    const text = d.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";

    // Aggressively extract JSON
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "No results found. Try rephrasing your search." });
    }

    let parsed;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      // Try cleaning common issues
      try {
        const cleaned = text.slice(start, end + 1)
          .replace(/[\u0000-\u001F]+/g, " ")
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "Could not read results. Please try again." });
      }
    }

    if (!parsed.products?.length) {
      return res.status(200).json({ products: [], angle: "", message: "No results found. Try a different search." });
    }

    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
