import { Hono } from "hono";

const download = new Hono();

download.get("/:version/apk", async (c) => {
  const url = process.env.BETA_APK_URL!;
  if (c.req.param("version") !== "1.0.1") {
    return c.json({ success: false, error: "Invalid version" }, 400);
  }
  return c.redirect(url, 302);
});

export default download;
