import { mkdir, readFile, writeFile } from "node:fs/promises";

const origin = new URL(process.env.LOCCAL_APP_URL ?? "https://loccal-web.vercel.app").origin;
const html = (await readFile(new URL("../public/offline.html", import.meta.url), "utf8"))
  .replace('href="/dashboard"', `href="${origin}/dashboard"`);
await mkdir(new URL("../native/shell/", import.meta.url), { recursive: true });
await writeFile(new URL("../native/shell/index.html", import.meta.url), html);
