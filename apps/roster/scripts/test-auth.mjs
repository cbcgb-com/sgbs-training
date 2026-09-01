// Prove/disprove JWT validation against the dev deployment, bypassing React.
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const token = process.argv[2];
const client = new ConvexHttpClient("https://rugged-oriole-958.convex.cloud");
client.setAuth(token);
try {
  const me = await client.query(api.students.me, {});
  console.log("me =", JSON.stringify(me));
} catch (e) {
  console.log("query threw:", e.message?.slice(0, 200));
}
const unauth = new ConvexHttpClient("https://rugged-oriole-958.convex.cloud");
const anon = await unauth.query(api.students.me, {});
console.log("anonymous me =", JSON.stringify(anon));
await client.clearAuth();
process.exit(0);