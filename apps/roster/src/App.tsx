import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { createContext, useContext, useState } from "react";
import { api } from "../convex/_generated/api";
import { SignInSheet } from "./auth/SignIn";
import { sessionTokenStore } from "./auth/session";
import { CURRENT_QUARTER } from "./constants";
import Directory from "./Directory";
import GroupAssigner from "./GroupAssigner";
import Form from "./Form";
import MyGroup from "./MyGroup";
import Roster from "./Roster";
import ScheduleView from "./ScheduleView";

type TabKey =
  | "register"
  | "group"
  | "directory"
  | "schedule"
  | "roster"
  | "assign";

const TabContext = createContext<{ tab: TabKey; setTab: (t: TabKey) => void }>({
  tab: "register",
  setTab: () => {},
});

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  return (
    <div className="min-h-screen bg-paper-deep px-3 py-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl border border-rule bg-paper shadow-[0_1px_2px_rgba(38,33,22,0.05),0_32px_64px_-32px_rgba(38,33,22,0.3)]">
        {isLoading ? (
          <LoadingSheet />
        ) : !isAuthenticated || sessionTokenStore.isExpired() ? (
          <GuestView />
        ) : (
          <MemberView />
        )}
      </div>
    </div>
  );
}

function LoadingSheet() {
  return (
    <>
      <Header right={null} nav={<nav className="mt-8 h-[38px]" />} />
      <main className="px-5 py-10 sm:px-12 sm:py-12">
        <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
          載入中……
        </p>
      </main>
      <Footer />
    </>
  );
}

// ---- Signed-out: registration + sign-in on one sheet ----

function GuestView() {
  const [mode, setMode] = useState<"register" | "signin">("register");
  return (
    <>
      <Header
        right={
          <button
            onClick={() => setMode(mode === "register" ? "signin" : "register")}
            className="border border-rule px-4 py-2 font-serif-tc text-sm tracking-[0.2em] text-ink transition-colors hover:border-ink"
          >
            {mode === "register" ? "登入" : "報名"}
          </button>
        }
        nav={
          <nav className="-mb-px mt-8 flex gap-1.5 text-sm sm:gap-2">
            <span className="rounded-t-md border border-b-0 border-rule bg-paper px-5 py-2 font-serif-tc font-bold tracking-[0.2em] text-ink sm:px-7">
              {mode === "register" ? "報名" : "登入"}
            </span>
          </nav>
        }
      />
      <main className="px-5 py-10 sm:px-12 sm:py-12">
        {mode === "signin" ? (
          <SignInSheet />
        ) : (
          <>
            <Form guestMode />
            <div className="mx-auto mt-10 max-w-2xl border-t border-rule pt-6 text-center">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                已於本季或以往報名？以登記的郵箱{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-serif-tc text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
                >
                  登入
                </button>
                查看小組與課堂安排。
              </p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

// ---- Signed-in: role determines the tabs ----

function MemberView() {
  const me = useQuery(api.students.me);
  if (me === undefined || me === null) return <LoadingSheet />;

  const tabs: { key: TabKey; label: string }[] = me.isInstructor
    ? [
        { key: "register", label: "註冊" },
        { key: "assign", label: "分組" },
        { key: "roster", label: "名單" },
        { key: "schedule", label: "課堂安排" },
      ]
    : [
        { key: "register", label: "註冊" },
        { key: "group", label: "我的組" },
        { key: "directory", label: "聯絡表" },
        { key: "schedule", label: "課堂安排" },
      ];

  return (
    <TabShell tabs={tabs} isInstructor={me.isInstructor} registered={!!me.student} />
  );
}

function SignOutButton() {
  const signOutServer = useMutation(api.auth.signOut);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const jti = sessionTokenStore.jti();
    try {
      if (jti) await signOutServer({ jti });
    } catch {
      // Server-side revocation is best-effort; local sign-out always wins.
    }
    sessionTokenStore.clear();
    window.location.reload();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="border border-rule px-3 py-1.5 font-serif-tc text-xs tracking-[0.2em] text-ink transition-colors hover:border-ink disabled:opacity-50"
    >
      登出
    </button>
  );
}

function TabShell({
  tabs,
  isInstructor,
  registered,
}: {
  tabs: { key: TabKey; label: string }[];
  isInstructor: boolean;
  registered: boolean;
}) {
  const [tab, setTab] = useState<TabKey>(tabs[0].key);
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <TabContext.Provider value={{ tab: active, setTab }}>
      <Header
        right={<SignOutButton />}
        nav={
          <nav
            aria-label="主導覽"
            className="-mb-px mt-8 flex gap-1.5 overflow-x-auto text-base sm:gap-2"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={active === t.key ? "page" : undefined}
                className={
                  "rounded-t-md border border-b-0 px-5 py-2 font-serif-tc font-bold tracking-[0.2em] transition-colors sm:px-7 " +
                  (active === t.key
                    ? "border-rule bg-paper text-ink"
                    : "border-transparent bg-transparent text-ink-soft hover:text-ink")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        }
      />
      <main
        className={
          "px-5 py-10 sm:px-12 sm:py-12 " +
          (active === "roster" ? "sm:px-6 lg:px-10" : "")
        }
      >
        {isInstructor ? (
          <>
            {active === "register" && <Form adminMode />}
            {active === "assign" && <GroupAssigner />}
            {active === "roster" && <Roster />}
            {active === "schedule" && <ScheduleView isInstructor />}
          </>
        ) : (
          <>
            {active === "register" && <Form registered={registered} />}
            {active === "group" && <MyGroup />}
            {active === "directory" && <Directory isInstructor={isInstructor} />}
            {active === "schedule" && <ScheduleView isInstructor={false} />}
          </>
        )}
      </main>
      <Footer />
    </TabContext.Provider>
  );
}

// ---- Shared chrome ----

function Header({
  right,
  nav,
}: {
  right: React.ReactNode;
  nav: React.ReactNode;
}) {
  return (
    <header className="relative border-b border-rule px-5 pb-0 pt-9 sm:px-12 sm:pt-12">
      <div className="absolute right-4 top-4 flex items-start gap-3 sm:right-6 sm:top-8 sm:gap-4">
        <div className="seal-stamp flex size-12 flex-col items-center justify-center border-2 border-vermilion sm:size-14">
          <span className="font-serif-tc text-[10px] font-bold leading-tight tracking-[0.2em] text-vermilion sm:text-xs">
            {CURRENT_QUARTER.slice(0, 4)}
          </span>
          <span className="font-serif-tc text-[10px] font-bold leading-tight tracking-[0.2em] text-vermilion sm:text-xs">
            {CURRENT_QUARTER.slice(4)}
          </span>
        </div>
        {right}
      </div>

      <h1 className="mt-9 font-serif-tc text-[26px] font-black leading-tight tracking-[0.06em] text-ink sm:mt-0 sm:text-4xl">
        小組查經訓練主日學
      </h1>
      <p className="mt-2 text-xs tracking-[0.3em] text-ink-soft sm:text-[13px]">
        CITY LIGHT CHURCH · CBCGB
      </p>

      {nav}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-rule px-5 py-4 sm:px-12">
      <p className="text-center text-xs tracking-[0.15em] text-ink-soft">
        小組查經訓練檔案 · 自二〇一五年秋
      </p>
    </footer>
  );
}

export function useTab() {
  return useContext(TabContext);
}