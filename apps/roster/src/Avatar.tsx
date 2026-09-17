// Avatar: photo when present, otherwise an initial-character seal.
// Shared by every view that lists students next to their headshots.
export default function Avatar({
  name,
  url,
  size = 26,
}: {
  name: string;
  url?: string | null;
  size?: number;
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
