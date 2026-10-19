import { createContext, useContext } from "react";

// Shared by the chrome (App.tsx) and pages that jump tabs (回饋, 我的資料).
// Kept out of App.tsx so feature modules can call useTab without a
// circular import through the root component.

export type TabKey =
  | "register"
  | "profile"
  | "group"
  | "directory"
  | "schedule"
  | "roster"
  | "attendance"
  | "assign"
  | "feedback";

export const TabContext = createContext<{
  tab: TabKey;
  setTab: (t: TabKey) => void;
}>({
  tab: "register",
  setTab: () => {},
});

export function useTab() {
  return useContext(TabContext);
}
