const SITE_URL = "https://policycanary.io";
const INDEXNOW_KEY = "793bba199c7879f0863533c058626e69";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const GSC_INSPECT_URL = "https://search.google.com/search-console/inspect";

/**
 * Notify search engines (Bing, Yandex, etc.) about new/updated URLs via IndexNow,
 * then ping Slack so RB remembers to submit to Google Search Console.
 * Fire-and-forget — errors are logged but never block the caller.
 */
export function notifyIndexNow(urls: string | string[]): void {
  const urlList = Array.isArray(urls) ? urls : [urls];
  if (urlList.length === 0) return;

  const fullUrls = urlList.map((u) =>
    u.startsWith("http") ? u : `${SITE_URL}${u}`
  );

  // 1. IndexNow ping (Bing, Yandex, etc.)
  const payload = {
    host: "policycanary.io",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: fullUrls,
  };

  fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (res.ok || res.status === 202) {
        console.log(`[indexnow] Submitted ${fullUrls.length} URL(s)`);
      } else {
        console.warn(`[indexnow] ${res.status} ${res.statusText}`);
      }
    })
    .catch((err) => {
      console.warn("[indexnow] Failed:", err.message);
    });

  // 2. Slack reminder to submit to Google Search Console
  notifySlackGSC(fullUrls);
}

function notifySlackGSC(urls: string[]): void {
  const webhookUrl = process.env.SLACK_WEBHOOK_SEO;
  if (!webhookUrl) return;

  const urlLines = urls.map((u) => `• <${u}|${u}>`).join("\n");
  const message = {
    text: `🔍 *Index on Google Search Console*\n${urlLines}\n\nIndexNow pinged (Bing/Yandex). Go submit to GSC:\n<${GSC_INSPECT_URL}|Open URL Inspection>`,
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  }).catch((err) => {
    console.warn("[slack-seo] Failed:", err.message);
  });
}
