import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Theme Clerk's sign-in/modal surfaces to match the 和合本 paper world.
const clerkAppearance = {
  variables: {
    colorPrimary: "#b3402a",
    colorBackground: "#faf6ec",
    colorText: "#262116",
    colorInputBackground: "#ffffff",
    colorInputText: "#262116",
    borderRadius: "0.375rem",
    fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
      appearance={clerkAppearance}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
