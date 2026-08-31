import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTab } from "./App";

// 我的組: my group mates this quarter — names, photos, contact info.
export default function MyGroup() {
  const { setTab } = useTab();
  const group = useQuery(api.students.myGroup);
  const photos = useQuery(api.students.photoUrls);
  const renameMyGroup = useMutation(api.students.renameMyGroup);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  async function saveName() {
    setEditing(false);
    if (!group || !group.groupName) return;
    if (nameValue.trim() === group.groupName || nameValue.trim() === "") return;
    setRenameError(null);
    try {
      await renameMyGroup({ to: nameValue });
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : String(err));
    }
  }

  if (group === undefined || photos === undefined) {
    return (
      <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  if (!group.registered) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif-tc text-lg font-bold text-ink">
          本季度尚未登記
        </p>
        <p className="mt-3 text-base text-ink-soft">
          註冊後即可查看您的小組成員。
        </p>
        <button
          onClick={() => setTab("register")}
          className="mt-8 bg-ink px-10 py-3 font-serif-tc text-sm font-bold tracking-[0.3em] text-paper transition-colors hover:bg-vermilion"
        >
          前往註冊
        </button>
      </div>
    );
  }

  if (!group.groupName) {
    return (
      <p className="py-10 text-center font-serif-tc text-sm leading-loose text-ink-soft">
        已登記，小組尚未分配。
        <br />
        請留意課堂公告或聯絡同工。
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-4">
        {editing ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setNameValue(group.groupName ?? "");
                setEditing(false);
              }
            }}
            aria-label="組名"
            className="min-w-0 flex-1 border-0 border-b border-vermilion bg-transparent p-0 font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink focus:outline-none"
          />
        ) : (
          <h2
            onClick={() => {
              setNameValue(group.groupName ?? "");
              setEditing(true);
            }}
            title="點擊修改組名"
            className="cursor-pointer font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink hover:text-vermilion"
          >
            {group.groupName}
          </h2>
        )}
        <span className="font-serif-tc text-sm text-ink-soft">
          {group.members.length} 位組員
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        點擊組名即可修改 · {renameError ?? "組名將同步給所有組員"}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {group.members.map((m) => (
          <li
            key={m._id}
            className="flex items-center gap-3 border border-rule bg-paper px-4 py-3"
          >
            <Avatar
              name={m.name}
              url={m.photoStorageId ? photos[m.photoStorageId] : undefined}
              size={40}
            />
            <div className="min-w-0">
              <p className="font-serif-tc text-lg font-bold text-ink">
                {m.name}
                {m.isMe && (
                  <span className="ml-2 rounded-sm bg-paper-deep px-1.5 py-0.5 text-xs tracking-[0.1em] text-ink-soft">
                    我
                  </span>
                )}
              </p>
              {m.email && (
                <p className="truncate text-sm text-ink-soft">{m.email}</p>
              )}
              {m.fellowship && (
                <p className="mt-0.5 text-sm text-ink-soft/80">
                  {m.fellowship}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({
  name,
  url,
  size,
}: {
  name: string;
  url?: string | null;
  size: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={`${name}的照片`}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full border border-rule object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-rule bg-paper-deep font-serif-tc text-ink-soft"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {name.charAt(0)}
    </span>
  );
}
