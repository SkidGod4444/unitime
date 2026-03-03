import { Hono } from "hono";

const download = new Hono();

download.get("/apk", async (c) => {
  const url = process.env.BETA_APK_URL;
  if (!url) {
    return c.json({ success: false, error: "APK URL not configured" }, 503);
  }
  return c.redirect(url, 302);
});

export default download;
