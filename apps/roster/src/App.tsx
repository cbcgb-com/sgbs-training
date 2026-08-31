import { SignInButton, UserButton, useAuth } from "@clerk/react";
import { useQuery } from "convex/react";
import { createContext, useContext, useState } from "react";
import { api } from "../convex/_generated/api";
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
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <div className="min-h-screen bg-paper-deep px-3 py-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl border border-rule bg-paper shadow-[0_1px_2px_rgba(38,33,22,0.05),0_32px_64px_-32px_rgba(38,33,22,0.3)]">
        {!isLoaded || !isSignedIn ? <GuestView isLoaded={isLoaded} /> : <MemberView />}
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

// ---- Signed-out: invitation to sign in ----

function GuestView({ isLoaded }: { isLoaded: boolean | undefined }) {
  return (
    <>
      <Header
        right={
          <SignInButton mode="modal">
            <button className="border border-rule px-4 py-2 font-serif-tc text-sm tracking-[0.2em] text-ink transition-colors hover:border-ink">
              登入
            </button>
          </SignInButton>
        }
        nav={
          <nav className="-mb-px mt-8 flex gap-1.5 text-sm sm:gap-2">
            <span className="rounded-t-md border border-b-0 border-rule bg-paper px-5 py-2 font-serif-tc font-bold tracking-[0.2em] text-ink sm:px-7">
              報名
            </span>
          </nav>
        }
      />
      <main className="px-5 py-10 sm:px-12 sm:py-12">
        {!isLoaded ? (
          <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
            載入中……
          </p>
        ) : (
          <div className="ink-in mx-auto max-w-md py-8 text-center">
            <p className="font-serif-tc text-xl font-bold leading-loose text-ink">
              「你當竭力在神面前得蒙喜悅，作無愧的工人，
              按著正意分解真理的道。」
            </p>
            <p className="mt-3 font-serif-tc text-xs tracking-[0.25em] text-vermilion">
              提摩太後書二章十五節
            </p>
            <p className="mt-8 text-base leading-relaxed text-ink-soft">
              登入後即可報名本季課程、查看小組成員、聯絡表與課堂安排。
            </p>
            <SignInButton mode="modal">
              <button className="mt-8 w-full bg-ink py-3.5 font-serif-tc text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion sm:w-auto sm:px-16">
                登入
              </button>
            </SignInButton>
            <p className="mt-4 text-[13px] text-ink-soft">請勿透過表單提交密碼。</p>
          </div>
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
        right={<UserButton />}
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
      <div className="seal-stamp absolute right-14 top-4 sm:right-20 sm:top-8">
        <div className="flex size-12 flex-col items-center justify-center border-2 border-vermilion sm:size-14">
          <span className="font-serif-tc text-[10px] font-bold leading-tight tracking-[0.2em] text-vermilion sm:text-xs">
            {CURRENT_QUARTER.slice(0, 4)}
          </span>
          <span className="font-serif-tc text-[10px] font-bold leading-tight tracking-[0.2em] text-vermilion sm:text-xs">
            {CURRENT_QUARTER.slice(4)}
          </span>
        </div>
      </div>
      <div className="absolute right-4 top-4 sm:right-6 sm:top-8">{right}</div>

      <h1 className="font-serif-tc text-[26px] font-black leading-tight tracking-[0.06em] text-ink sm:text-4xl">
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
