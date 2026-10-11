import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev-only sign-in helper: GET /dev-login?email=… performs the same
// email-lookup sign-in the 登入 sheet does (auth.signIn), stores the
// returned session token, and redirects to the app. Serve mode only —
// the production build never includes it. Made for driving the dev /
// preview deployments from scripts and the browser without typing the
// sheet by hand every time.
function devLogin(): Plugin {
  return {
    name: "dev-login",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/dev-login", (req, res) => {
        const email = new URL(req.url ?? "/", "http://localhost").searchParams.get(
          "email",
        );
        const convexUrl = process.env.VITE_CONVEX_URL;
        if (!email || !convexUrl) {
          res.statusCode = 400;
          res.end("usage: /dev-login?email=… (requires VITE_CONVEX_URL)");
          return;
        }
        fetch(`${convexUrl}/api/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "auth:signIn",
            args: { email },
            format: "json",
          }),
        })
          .then((r) => r.json())
          .then((body) => {
            const token = body?.value?.token ?? body?.token;
            if (!token) throw new Error(JSON.stringify(body).slice(0, 300));
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(
              `<!doctype html><script>
              localStorage.setItem("sgbs.auth.token", ${JSON.stringify(token)});
              location.replace("/");
              </script>已登入，返回應用中……`,
            );
          })
          .catch((err) => {
            res.statusCode = 502;
            res.end(`dev-login failed: ${String(err)}`);
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devLogin()],
});
