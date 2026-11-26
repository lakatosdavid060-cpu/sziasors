export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !apiToken) {
    return res.status(503).json({ error: "A Cloudflare TURN nincs konfigurálva a Vercelen." });
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl: 86400 })
      }
    );

    const data = await response.json();
    if (!response.ok || !data.iceServers) {
      console.error("Cloudflare TURN error:", response.status);
      return res.status(502).json({ error: "Nem sikerült TURN hitelesítő adatokat kérni." });
    }

    // Port 53 is omitted because browsers commonly block it.
    const iceServers = data.iceServers.map(server => ({
      ...server,
      urls: Array.isArray(server.urls)
        ? server.urls.filter(url => !url.includes(":53"))
        : server.urls
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ iceServers });
  } catch (error) {
    console.error("TURN request failed:", error);
    return res.status(500).json({ error: "TURN szolgáltatás átmenetileg nem érhető el." });
  }
}
