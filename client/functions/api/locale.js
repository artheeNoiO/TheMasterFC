/** Geo locale — EN default, TH when visitor is in Thailand (Cloudflare CF-IPCountry) */
export async function onRequestGet(context) {
  const { request } = context;
  const country =
    request.cf?.country ||
    request.headers.get("CF-IPCountry") ||
    request.headers.get("cf-ipcountry") ||
    "";

  const host = new URL(request.url).hostname.toLowerCase();
  const thDomain = host.endsWith(".th") || host === "th";
  const inThailand = country === "TH" || thDomain;
  const lang = inThailand ? "th" : "en";

  return new Response(
    JSON.stringify({ lang, country: country || null, thDomain }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "private, max-age=300",
      },
    },
  );
}
