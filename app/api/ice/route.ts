import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cloudflare TURN long-lived secrets stay on the server. Only short-lived ICE
// credentials are returned to the authenticated browser session.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !apiToken) {
    return NextResponse.json({ error: 'A Cloudflare TURN még nincs konfigurálva.' }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Cloudflare TURN credential request failed:', response.status, detail);
      return NextResponse.json({ error: 'A Cloudflare TURN hitelesítés nem sikerült.' }, { status: 502 });
    }

    const data = await response.json() as {
      iceServers?: Array<{ urls?: string | string[]; username?: string; credential?: string }>;
    };
    if (!Array.isArray(data.iceServers) || data.iceServers.length === 0) {
      return NextResponse.json({ error: 'A Cloudflare nem adott vissza ICE szervereket.' }, { status: 502 });
    }

    // Port 53 is commonly blocked by browsers/networks; exclude it.
    const iceServers = data.iceServers.map((server) => {
      if (!server.urls) return server;
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      const filtered = urls.filter((url) => !/:53(?:\?|$)/.test(url));
      return { ...server, urls: filtered };
    }).filter((server) => Array.isArray(server.urls) ? server.urls.length > 0 : Boolean(server.urls));

    return NextResponse.json({ iceServers }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Cloudflare TURN request error:', error);
    return NextResponse.json({ error: 'Nem sikerült elérni a Cloudflare TURN szolgáltatást.' }, { status: 502 });
  }
}
