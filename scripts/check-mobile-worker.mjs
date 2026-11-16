import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const handlers = {};
const cached = [];
const deleted = [];
let offline = false;
const fallback = new Response("Reconnect");
vm.runInNewContext(await readFile(new URL("../public/sw.js", import.meta.url), "utf8"), {
  self: { location: { origin: "https://loccal.test" }, addEventListener: (name, handler) => { handlers[name] = handler; } },
  caches: {
    open: async () => ({ add: async (url) => { cached.push(url); } }),
    keys: async () => ["loccal-offline-v0", "loccal-offline-v1", "other-app"],
    delete: async (key) => { deleted.push(key); },
    match: async (url) => { assert.equal(url, "/offline.html"); return fallback; }
  },
  fetch: async () => { if (offline) throw new Error("offline"); return new Response("Live"); },
  URL, Response
});

let work;
handlers.install({ waitUntil: (promise) => { work = promise; } });
await work;
assert(cached.every((url) => url === "/offline.html"));
handlers.activate({ waitUntil: (promise) => { work = promise; } });
await work;
assert.deepEqual(deleted, ["loccal-offline-v0"]);

function request(path, mode = "navigate", method = "GET") {
  let response;
  handlers.fetch({
    request: { url: `https://loccal.test${path}`, mode, method },
    respondWith: (promise) => { response = promise; }
  });
  return response;
}
assert.equal(await (await request("/dashboard")).text(), "Live");
assert.equal(request("/api/loccal/month", "cors"), undefined);
assert.equal(request("/api/auth/callback/google", "navigate", "POST"), undefined);
offline = true;
assert.equal(await request("/dashboard"), fallback);
assert.equal(request("/api/friends", "cors"), undefined);
console.log("Mobile worker checks passed: static fallback only; API and auth writes untouched.");
