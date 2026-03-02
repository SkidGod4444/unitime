import { Hono } from "hono";

const download = new Hono();

download.get("/apk", async (c) => {
  // Redirect to the GitHub Release APK URL
  // Replace this with the actual URL from your GitHub release once created
  const githubReleaseUrl = "https://github.com/SkidGod4444/unitime/releases/download/beta-v1.0.1/application-cd63f278-37cf-4498-b42e-a50f840cd7e4.apk";
  
  return c.redirect(githubReleaseUrl, 302);
});

export default download;
