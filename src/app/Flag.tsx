import { iso } from "@/lib/teams";

// Real flag images (emoji flags don't render on Windows). Sourced from flagcdn.com.
// `className` controls the width (e.g. "w-6"); height stays proportional.
export default function Flag({
  team,
  className = "w-6",
}: {
  team: string | null | undefined;
  className?: string;
}) {
  const code = iso(team);
  if (!code) {
    return (
      <span className={`inline-block text-center ${className}`} aria-hidden>
        🏳️
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={team ?? ""}
      title={team ?? ""}
      loading="lazy"
      className={`inline-block h-auto rounded-[2px] ring-1 ring-black/10 align-middle ${className}`}
    />
  );
}
