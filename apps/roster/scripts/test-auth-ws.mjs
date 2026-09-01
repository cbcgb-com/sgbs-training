// WebSocket-path auth test — mirrors what ConvexReactClient does.
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const token = process.argv[2];
const client = new ConvexClient("https://rugged-oriole-958.convex.cloud");
client.setAuth(async () => token);
try {
  const me = await client.query(api.students.me, {});
  console.log("WS me =", JSON.stringify(me));
} catch (e) {
  console.log("WS query threw:", String(e?.message ?? e).slice(0, 300));
}
process.exit(0);