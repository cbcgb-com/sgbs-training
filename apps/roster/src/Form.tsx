import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { CodeStep, stageRegistration } from "./auth/SignIn";
import { signInWithToken } from "./auth/session";
import {
  BAPTISM_TIMES,
  CURRENT_QUARTER,
  EXPERIENCES,
  FELLOWSHIPS,
  GENDERS,
} from "./constants";

// Faithful reimplementation of the Airtable form view 小组查经训练注册
// (shrS5gKu57LudKDSh): the remaining fields + submit, set here as ruled
// ledger lines on a scripture page.
//
// Modes:
// - guestMode: the signed-out registration sheet. The form collects the
//   registrant's email, sends a 6-digit code, and only on code entry is
//   the student row created (and the member signed in).
// - registered (signed-in student): already registered this quarter.
// - adminMode (signed-in instructor): register on behalf of someone
//   else; the code email goes to the registrant's address.
export default function Form({
  registered,
  adminMode = false,
  guestMode = false,
}: {
  registered?: boolean;
  adminMode?: boolean;
  guestMode?: boolean;
}) {
  const generateUploadUrl = useMutation(api.students.generateUploadUrl);
  const requestCode = useMutation(api.auth.requestCode);
  const registerStudent = useMutation(api.students.registerStudent);

  const [stage, setStage] = useState<"form" | "code">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [fellowship, setFellowship] = useState("");
  const [baptismTime, setBaptism] = useState("");
  const [leadingExperience, setExperience] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"created" | "duplicate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke the object URL when the preview changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

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

  // Back-to-back registrations (admin mode): clear everything for the next
  // person in line.
  function resetForNext() {
    setName("");
    setEmail("");
    setGender("");
    setFellowship("");
    setBaptism("");
    setExperience("");
    setConfirmed(false);
    removePhoto();
    setResult(null);
    setError(null);
    setStage("form");
  }

  async function uploadPhoto(
    file: File,
  ): Promise<Id<"_storage"> | undefined> {
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

  // Submit step 1 (form → code): stage the payload and email the code.
  // Admin mode skips the code entirely — the instructor vouches for the
  // address (registerStudent is instructor-gated server-side).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (adminMode) {
        const photoStorageId = photo ? await uploadPhoto(photo) : undefined;
        await registerStudent({
          name,
          gender,
          fellowship,
          baptismTime,
          leadingExperience,
          confirmedAttendance: confirmed,
          quarter: CURRENT_QUARTER,
          photoStorageId,
          email,
        });
        setResult("created");
        return;
      }
      const photoStorageId = photo ? await uploadPhoto(photo) : undefined;
      stageRegistration({
        name,
        gender,
        fellowship,
        baptismTime,
        leadingExperience,
        confirmedAttendance: confirmed,
        quarter: CURRENT_QUARTER,
        photoStorageId,
      });
      await requestCode({ email, name });
      setStage("code");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  // Submit step 2 (code verified): the row exists and the session token
  // is in hand — persist it; the reload lands the member signed in.
  function onVerified(token: string) {
    signInWithToken(token);
  }

  if (stage === "code") {
    return (
      <CodeStep
        email={email}
        onVerified={(token) => onVerified(token)}
      />
    );
  }

  if (!guestMode && !adminMode && registered) {
    return (
      <div className="ink-in mx-auto max-w-md py-10 text-center">
        <p className="font-serif-tc text-3xl font-black tracking-[0.3em] text-ink">
          已登記
        </p>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          您已登記 {CURRENT_QUARTER} 的課程。請在「我的組」查看組員，
          在「課堂安排」查看主領與觀察的日期。
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="ink-in mx-auto max-w-xl py-6 text-center">
        <p className="font-serif-tc pl-[0.4em] text-4xl font-black tracking-[0.4em] text-ink sm:text-5xl">
          {result === "created" ? "謝謝" : "已註冊"}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          {result === "created"
            ? adminMode
              ? `已為 ${name || "學員"} 登記 ${CURRENT_QUARTER} 的課程。學員現在可以用此郵箱登入。`
              : `您的報名已登記（${CURRENT_QUARTER}），我們會透過郵箱與您聯絡。`
            : "這個郵箱在本季度已經登記過了；如需更改資料，請聯絡同工。"}
        </p>
        {adminMode && (
          <button
            onClick={resetForNext}
            className="mt-6 border border-rule px-8 py-2.5 font-serif-tc text-sm font-bold tracking-[0.2em] text-ink transition-colors hover:border-ink"
          >
            登記另一位
          </button>
        )}
        <div className="mx-auto mt-10 max-w-md border-t border-gold/60 pt-8">
          <p className="font-serif-tc text-[15px] leading-loose text-ink">
            「你當竭力在神面前得蒙喜悅，作無愧的工人，
            按著正意分解真理的道。」
          </p>
          <p className="mt-3 font-serif-tc text-sm tracking-[0.25em] text-vermilion">
            提摩太後書二章十五節
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
      <div className="border-b-2 border-ink pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
            小組查經訓練註冊
          </h2>
          <span className="font-serif-tc text-sm font-bold text-vermilion">
            {CURRENT_QUARTER}
          </span>
        </div>
      </div>

      <div className="mt-2 space-y-7">
        <RuledField id="reg-name" label="名字" required>
          <input
            id="reg-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={PLACEHOLDER.name}
            className={ruledInput}
          />
        </RuledField>

        <RuledField id="reg-gender" label="性別" required>
          <RuledSelect
            id="reg-gender"
            name="gender"
            autoComplete="sex"
            value={gender}
            onChange={setGender}
            options={[...GENDERS]}
            placeholder="請選擇"
          />
        </RuledField>

        <RuledField id="reg-fellowship" label="團契" required>
          <RuledSelect
            id="reg-fellowship"
            value={fellowship}
            onChange={setFellowship}
            options={[...FELLOWSHIPS]}
            placeholder="請選擇"
          />
        </RuledField>

        <RuledField
          id="reg-email"
          label="郵箱"
          required
          note={
            adminMode
              ? "填寫學員的電子郵箱（之後學員可用此郵箱登入查看自己的組別與安排）。"
              : "我們會發送六位驗證碼到此郵箱以完成報名。請選擇您能收信的郵箱。"
          }
        >
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={ruledInput}
          />
        </RuledField>

        <RuledField id="reg-baptism" label="受洗時間" required>
          <RuledSelect
            id="reg-baptism"
            value={baptismTime}
            onChange={setBaptism}
            options={[...BAPTISM_TIMES]}
            placeholder="請選擇"
          />
        </RuledField>

        <RuledField id="reg-experience" label="帶領查經經驗" required>
          <RuledSelect
            id="reg-experience"
            value={leadingExperience}
            onChange={setExperience}
            options={[...EXPERIENCES]}
            placeholder="請選擇"
          />
        </RuledField>

        <RuledField
          id="reg-attendance"
          label="課堂出席"
          required
        >
          <label className="flex cursor-pointer items-start gap-3 pt-1">
            <input
              id="reg-attendance"
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-4 shrink-0 accent-vermilion"
            />
            <span className="text-[15px] leading-relaxed text-ink">
              請確認您可以出席
              <span className="font-serif-tc font-bold text-vermilion">
                至少4堂課
              </span>
            </span>
          </label>
        </RuledField>

        <RuledField
          id="reg-photo-camera"
          label="個人照片"
          note="讓同工把名字和面孔對上（可選，僅供小組同工使用）。"
        >
          <div className="flex items-center gap-4 pt-1">
            {photoPreview ? (
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
            ) : (
              <>
                <PhotoButton id="reg-photo-camera" onFile={acceptPhoto} capture="user">
                  拍照
                </PhotoButton>
                <PhotoButton onFile={acceptPhoto}>從相簿選擇</PhotoButton>
              </>
            )}
          </div>
        </RuledField>
      </div>

      {error && (
        <p role="alert" className="mt-8 border-t border-vermilion pt-3 font-serif-tc text-sm tracking-[0.05em] text-vermilion">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-10 w-full bg-ink py-3.5 font-serif-tc pl-[0.4em] text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50 sm:w-auto sm:px-16"
      >
        {submitting ? "遞交中" : "遞交"}
      </button>

      <p className="mt-6 text-[13px] text-ink-soft">
        遞交後我們會寄出六位驗證碼，輸入後即完成報名。請勿透過表單提交密碼。
      </p>
    </form>
  );
}

// Server errors from createStudent are already in Chinese; anything else
// (network, internals) collapses to one honest recovery line.
function friendlyError(msg: string): string {
  if (/[\u4e00-\u9fff]/.test(msg)) return msg;
  return "遞交失敗，請檢查網路後重試；若持續失敗請聯絡同工。";
}

const PLACEHOLDER = {
  name: "姓名",
};

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
  name,
  autoComplete,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  name?: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      id={id}
      name={name}
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
