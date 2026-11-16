import type { CapacitorConfig } from "@capacitor/cli";

const url = new URL(process.env.LOCCAL_APP_URL ?? "https://loccal-web.vercel.app");
if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
  throw new Error("LOCCAL_APP_URL must use HTTPS (HTTP is allowed only on localhost).");
}

const config: CapacitorConfig = {
  appId: "app.loccal.ios",
  appName: "Loccal",
  webDir: "native/shell",
  server: { url: url.origin, cleartext: url.protocol === "http:", errorPath: "index.html" },
  ios: { contentInset: "never", backgroundColor: "#f8f8fc" }
};
export default config;
