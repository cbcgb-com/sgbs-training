import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useTab } from "./App";
import {
  BAPTISM_TIMES,
  CURRENT_QUARTER,
  EXPERIENCES,
  FELLOWSHIPS,
  GENDERS,
} from "./constants";

// 我的資料: the signed-in student's own record, rendered as the same
// ruled ledger sheet they registered on (Form.tsx) — viewing is the
// resting state, editing lifts each rule into a field. The email stays
// ruled text (identity-authoritative: sign-in is that email); 小組 stays
// ruled text (the instructor assigns it).
export default function MyProfile() {
  const profile = useQuery(api.students.myProfile);
  const updateProfile = useMutation(api.students.updateMyProfile);
  const updatePhoto = useMutation(api.students.updateMyPhoto);
  const generateUploadUrl = useMutation(api.students.generateUploadUrl);
  const { setTab } = useTab();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [fellowship, setFellowship] = useState("");
  const [baptismTime, setBaptism] = useState("");
  const [leadingExperience, setExperience] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Revoke the object URL when the preview changes or the sheet unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (profile === undefined) {
    return (
      <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  if (!profile.registered || !profile.student) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif-tc text-lg font-bold text-ink">
          本季度尚未登記
        </p>
        <p className="mt-3 text-base text-ink-soft">
          註冊後即可在此查看與更新您的資料。
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

  const s = profile.student;

  const missing = [
    !s.gender && "性別",
    !s.fellowship && "團契",
    !s.baptismTime && "受洗時間",
    !s.leadingExperience && "帶領查經經驗",
    !s.photoStorageId && "個人照片",
  ].filter(Boolean) as string[];

  function startEdit() {
    setName(s.name);
    setGender(s.gender);
    setFellowship(s.fellowship);
    setBaptism(s.baptismTime);
    setExperience(s.leadingExperience);
    setSaved(false);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    removePhoto();
  }

  async function acceptPhoto(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("請選擇照片檔案。");
      return;
    }
    setError(null);
    const scaled = await downscaleImage(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(scaled);
    setPhotoPreview(URL.createObjectURL(scaled));
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
  }

  async function uploadPhoto(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("photo upload failed");
    const { storageId } = (await res.json()) as { storageId: string };
    return storageId as Id<"_storage">;
  }

  // One 保存 for the whole sheet: particulars and photo ride together, so
  // the ledger stays a single document rather than per-field writes.
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // A newly picked photo uploads and replaces the stored one; leaving
      // the photo untouched saves only the particulars.
      if (photo) {
        await updatePhoto({ photoStorageId: await uploadPhoto(photo) });
      }
      await updateProfile({ name, gender, fellowship, baptismTime, leadingExperience });
      setEditing(false);
      setSaved(true);
      removePhoto();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // Remove the stored photo (clears the field and deletes the blob).
  async function handleRemovePhoto() {
    setError(null);
    setSaving(true);
    try {
      await updatePhoto({ photoStorageId: undefined });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-xl">
      <div className="border-b-2 border-ink pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
            我的資料
          </h2>
          <span className="font-serif-tc text-sm font-bold text-vermilion">
            {s.quarter || CURRENT_QUARTER}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {editing
            ? "更新後遞交，資料會同步到同工名單與小組名冊。"
            : "這是您報名時登記的資料。如需更改，請點選下方「更新資料」。"}
        </p>
      </div>

      {missing.length > 0 && !editing && (
        <div className="ink-in mt-6 border border-gold/60 bg-paper-deep/60 px-4 py-3">
          <p className="font-serif-tc text-sm font-bold text-ink">
            尚待補齊：{missing.join("、")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            報名時未填的欄位，歡迎在此補上，讓同工和組員更認識您。
          </p>
        </div>
      )}

      {saved && !editing && (
        <p className="ink-in mt-6 border-l-2 border-vermilion pl-3 font-serif-tc text-sm text-ink">
          已更新您的資料。
        </p>
      )}

      <div className="mt-2 space-y-7">
        <RuledField id="prof-name" label="名字" required>
          {editing ? (
            <input
              id="prof-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="姓名"
              className={ruledInput}
            />
          ) : (
            <RuledValue value={s.name} />
          )}
        </RuledField>

        <RuledField id="prof-gender" label="性別" required>
          {editing ? (
            <RuledSelect
              id="prof-gender"
              autoComplete="sex"
              value={gender}
              onChange={setGender}
              options={[...GENDERS]}
              placeholder="請選擇"
            />
          ) : (
            <RuledValue value={s.gender} />
          )}
        </RuledField>

        <RuledField id="prof-fellowship" label="團契" required>
          {editing ? (
            <RuledSelect
              id="prof-fellowship"
              value={fellowship}
              onChange={setFellowship}
              options={[...FELLOWSHIPS]}
              placeholder="請選擇"
            />
          ) : (
            <RuledValue value={s.fellowship} />
          )}
        </RuledField>

        <RuledField
          id="prof-email"
          label="郵箱"
          note="登入用的電子郵箱由系統保存，無法在此更改；如需更换請聯絡同工。"
        >
          <RuledValue value={s.email} />
        </RuledField>

        <RuledField id="prof-baptism" label="受洗時間" required>
          {editing ? (
            <RuledSelect
              id="prof-baptism"
              value={baptismTime}
              onChange={setBaptism}
              options={[...BAPTISM_TIMES]}
              placeholder="請選擇"
            />
          ) : (
            <RuledValue value={s.baptismTime} />
          )}
        </RuledField>

        <RuledField id="prof-experience" label="帶領查經經驗" required>
          {editing ? (
            <RuledSelect
              id="prof-experience"
              value={leadingExperience}
              onChange={setExperience}
              options={[...EXPERIENCES]}
              placeholder="請選擇"
            />
          ) : (
            <RuledValue value={s.leadingExperience} />
          )}
        </RuledField>

        <RuledField id="prof-group" label="小組">
          <RuledValue value={s.groupName ?? ""} placeholder="未分配" />
        </RuledField>

        <RuledField
          id="prof-photo"
          label="個人照片"
          note="讓同工把名字和面孔對上（可選，僅供小組同工使用）。"
        >
          <div className="flex items-center gap-4 pt-1">
            {editing ? (
              photoPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={photoPreview}
                    alt="照片預覽"
                    className="size-16 rounded-full border border-rule object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="font-serif-tc text-sm tracking-[0.1em] text-vermilion underline underline-offset-4 hover:text-ink"
                  >
                    重新選擇
                  </button>
                </div>
              ) : profile.photoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={profile.photoUrl}
                    alt="個人照片"
                    className="size-16 rounded-full border border-rule object-cover"
                  />
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-3">
                      <PhotoButton id="prof-photo-camera" onFile={acceptPhoto} capture="user">
                        拍照
                      </PhotoButton>
                      <PhotoButton onFile={acceptPhoto}>從相簿選擇</PhotoButton>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={saving}
                      className="font-serif-tc text-[13px] tracking-[0.1em] text-ink-soft underline underline-offset-4 hover:text-vermilion disabled:opacity-50"
                    >
                      移除照片
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <PhotoButton id="prof-photo-camera" onFile={acceptPhoto} capture="user">
                    拍照
                  </PhotoButton>
                  <PhotoButton onFile={acceptPhoto}>從相簿選擇</PhotoButton>
                </div>
              )
            ) : profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="個人照片"
                className="size-16 rounded-full border border-rule object-cover"
              />
            ) : (
              <span className="font-serif-tc text-sm tracking-[0.1em] text-ink-soft">
                尚未上傳
              </span>
            )}
          </div>
        </RuledField>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 border-t border-vermilion pt-3 font-serif-tc text-sm tracking-[0.05em] text-vermilion"
        >
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink py-3.5 font-serif-tc pl-[0.4em] text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50 sm:px-16"
          >
            {saving ? "保存中" : "保存"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="border border-rule px-8 py-2.5 font-serif-tc text-sm font-bold tracking-[0.2em] text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="mt-10 w-full bg-ink py-3.5 font-serif-tc pl-[0.4em] text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion sm:w-auto sm:px-16"
        >
          更新資料
        </button>
      )}

      <p className="mt-6 text-[13px] text-ink-soft">
        郵箱與小組由同工管理；其他欄位可隨時更新。
      </p>
    </form>
  );
}

// A ruled read-only value: the ledger line as resting text.
function RuledValue({
  value,
  placeholder,
}: {
  value: string;
  placeholder?: string;
}) {
  return (
    <p className="border-b border-rule py-2 text-base text-ink">
      {value || (
        <span className="text-ink-soft">{placeholder ?? "（未填）"}</span>
      )}
    </p>
  );
}

function PhotoButton({
  id,
  onFile,
  capture,
  children,
}: {
  id?: string;
  onFile: (f: File | undefined | null) => void;
  capture?: "user";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/*"
        {...(capture ? { capture } : {})}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="border border-rule px-4 py-2 font-serif-tc text-sm tracking-[0.15em] text-ink transition-colors hover:border-ink"
      >
        {children}
      </button>
    </>
  );
}

// Downscale to at most 720px on the long edge and re-encode as JPEG so
// phone cameras don't upload multi-megabyte originals.
async function downscaleImage(file: File, maxEdge = 720): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const ruledInput =
  "w-full rounded-none border-0 border-b border-rule bg-transparent px-0 py-2 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none focus:ring-0";

function RuledField({
  id,
  label,
  required,
  note,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-serif-tc text-[15px] font-bold tracking-[0.1em] text-ink"
      >
        {label}
        {required && (
          <span className="ml-1 text-vermilion" aria-hidden>
            ＊
          </span>
        )}
      </label>
      {note && (
        <p className="mt-1.5 border-l border-gold/70 pl-3 text-[13px] leading-relaxed text-ink-soft">
          {note}
        </p>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RuledSelect({
  id,
  autoComplete,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      id={id}
      {...(autoComplete ? { autoComplete } : {})}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        ruledInput +
        " cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 fill=%22none%22 stroke=%22%2357503f%22 stroke-width=%221.5%22/></svg>')] bg-[position:right_0.25rem_center] bg-no-repeat pr-8 invalid:text-ink-soft"
      }
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o} className="bg-paper text-ink">
          {o}
        </option>
      ))}
    </select>
  );
}