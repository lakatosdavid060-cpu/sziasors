# SziaSors – egyszerű HTML + Vercel + Firebase + Cloudflare TURN

Ez a projekt egy statikus `index.html` felületet használ. Nincs Next.js, React vagy build lépés. A `api/` mappa két Vercel Serverless Functiont tartalmaz:
- `api/turn.js`: Cloudflare rövid élettartamú TURN ICE credentialök lekérése.
- `api/match.js`: Firebase Admin SDK-val védett várólista/párosítás API.

## 1. GitHub és Vercel
1. Hozz létre egy privát GitHub repositoryt `sziasors` néven.
2. Töltsd fel a ZIP tartalmát úgy, hogy az `index.html`, `package.json`, `vercel.json` és `api/` közvetlenül a repository gyökerében legyen.
3. Vercel → Add New → Project → importáld a repositoryt.
4. Framework Preset: Other. Build Command: üres / None. Output Directory: `.` (ha kérdezi).
5. Deploy előtt add hozzá a következő Environment Variables értékeket, majd Deploy.

## 2. Vercel Environment Variables

Firebase Admin:
- `FIREBASE_ADMIN_PROJECT_ID` = `blackcrown-cf4e0`
- `FIREBASE_ADMIN_CLIENT_EMAIL` = Firebase service account JSON `client_email` mezője
- `FIREBASE_ADMIN_PRIVATE_KEY` = a JSON teljes `private_key` értéke, a BEGIN/END sorokkal együtt. Vercelben egyetlen értékként add meg. A `\n` escape-eket a kód valódi sortöréssé alakítja.

A Realtime Database URL a szerveroldali API-ban is be van állítva, ezért nem kell külön környezeti változóként felvenned.

Firebase kliens konfiguráció:
Az általad megadott publikus Firebase config az `index.html` fájlban szerepel. A webes Firebase apiKey nem titkos; a biztonságot az Auth és az adatbázis-szabályok adják.

Cloudflare:
- `CLOUDFLARE_TURN_KEY_ID` = Cloudflare TURN Token ID
- `CLOUDFLARE_TURN_API_TOKEN` = Cloudflare TURN API Token / TURN key secret, amellyel a rövid élettartamú credential generálható

A Cloudflare token kizárólag Vercel Environment Variable legyen, soha ne kerüljön az `index.html` fájlba vagy GitHubra.

## 3. Firebase
1. Firebase Console → Authentication → Sign-in method → Anonymous → Enable.
2. Realtime Database → Rules → illeszd be a projekt `database.rules.json` fájlját → Publish.
3. Authentication → Settings → Authorized domains → add hozzá a Vercel által kiosztott `*.vercel.app` domain pontos hostnevét.

## 4. Deploy
A környezeti változók megadása után Deploy / Redeploy. Minden változó módosítása után új deployment szükséges.

## Fontos biztonsági és működési korlátok
- Ez az induló verzió csak 18+ felnőtt párosítást enged. A checkbox önbevallás, nem valódi életkor-ellenőrzés; nyilvános, éles indulás előtt életkor-ellenőrzés, jelentés/tiltás, moderáció és adatvédelmi/jogi dokumentumok szükségesek.
- A fiatalkorúak poolja nincs aktiválva. Ne kapcsold be egyszerű kliensoldali életkor-választóval.
- A `database.rules.json` a match jelzéseket és chatet a két résztvevőre korlátozza. A párosítási várólista kizárólag a szerveroldali Firebase Admin API-n keresztül írható.
- A felhasználó kiválasztja a saját megyéjét és a keresett partner megyéjét; a párosító API kölcsönösen figyelembe veszi a szűrőket. A várólista atomikus Firebase tranzakcióval párosít. A jelenlegi minimál verzió alapvető párosítást és WebRTC jelzést ad. Éles forgalom előtt két külön böngészővel teszteld a párosítást, a kameraengedélyt, a hangot, a TURN-t és a kilépést.
- A TURN relay adatforgalom Cloudflare díjköteles lehet. Ellenőrizd a Cloudflare Realtime aktuális árazását.
- WebRTC közvetlen P2P esetén a médiaforgalom nem a Vercelen fut át. Ha TURN kell, a média a Cloudflare TURN-en keresztül halad.
