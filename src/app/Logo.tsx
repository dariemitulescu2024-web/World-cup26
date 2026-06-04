// Imperial Capital logo. The crown emblem paths below are the official artwork
// (from the supplied logo.svg), recolored to currentColor so the parent controls
// the color — white on the navy header, navy on light backgrounds.

export function CrownMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 197 138" className={className} aria-hidden>
      {/* crown body */}
      <path
        fill="currentColor"
        d="M159.1,72.7c7.5-5.7,14.4-12.2,20.7-19.3v30.1C172.6,80.3,165.7,76.7,159.1,72.7 M147.1,80.9c11.5,7.3,23.7,13.5,36.3,18.6c0.9,0.4,1.9,0.7,2.9,0.7c3.7,0,6.6-3,6.6-6.6V33.8h0c0-2.2-1.1-4.3-3-5.5c-3.1-2-7.1-1.1-9.1,1.9c-9,13.8-20.5,25.6-33.7,34.9l0,0c-3.9,2.7-7.9,5.3-12.1,7.6c-29.5,16.2-43.5,16.2-73,0l0.5-0.3c13.1-9.6,25.2-20.6,36-32.7c9.5,10.7,19.9,20.4,31.2,29.1c4.2-2.3,8.2-4.7,12.2-7.4l0.2,0.1c-14.1-10.3-27-22.5-38.3-36.2c-0.1-0.1-0.2-0.2-0.3-0.3l-0.1-0.1l0,0l-0.1-0.1l-0.1-0.1l0,0l-0.1-0.1c-0.4-0.4-0.9-0.7-1.4-1l0,0l-0.1-0.1l0,0l0,0l0,0l-0.1,0l-0.1,0c-0.8-0.4-1.6-0.5-2.4-0.6l-0.1,0l0,0l-0.1,0h0l-0.1,0l0,0l-0.1,0c-0.8,0-1.7,0.2-2.4,0.6l-0.1,0l-0.1,0l0,0l0,0l0,0l-0.1,0.1l0,0c-0.5,0.3-0.9,0.6-1.4,1l-0.1,0.1l0,0l-0.1,0.1l-0.1,0.1l0,0L93.6,25c-0.1,0.1-0.2,0.2-0.3,0.3C82,39.1,69,51.3,54.7,61.7c-1.6,1.2-3.2,2.3-4.8,3.4C36.7,55.8,25.2,44,16.2,30.2c-2-3.1-6.1-3.9-9.1-1.9c-1.9,1.3-3,3.4-3,5.5h0v59.8c0,3.7,3,6.6,6.6,6.6c1,0,2-0.2,2.9-0.7C24.4,95.1,34.8,90,44.8,84c-4.1-2.6-8.1-5.4-11.9-8.4c-5.1,2.8-10.3,5.5-15.6,7.9V53.4C23.5,60.5,30.5,67,38,72.7c3.8,2.9,7.8,5.7,11.9,8.2l0,0C89.2,105,107.8,105,147.1,80.9z"
      />
      {/* three peak dots */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.3,0C5.7,0,1.2,4.5,1.2,10.1c0,5.6,4.5,10.1,10.1,10.1c5.6,0,10.1-4.5,10.1-10.1C21.3,4.5,16.8,0,11.3,0 M98.5,0C93,0,88.5,4.5,88.5,10.1c0,5.6,4.5,10.1,10.1,10.1c5.6,0,10.1-4.5,10.1-10.1C108.6,4.5,104.1,0,98.5,0z M185.8,0c-5.6,0-10.1,4.5-10.1,10.1c0,5.6,4.5,10.1,10.1,10.1c5.6,0,10.1-4.5,10.1-10.1C195.9,4.5,191.3,0,185.8,0z"
      />
      {/* two base bands */}
      <path
        fill="currentColor"
        d="M190.4,138c3.7,0,6.6-3,6.6-6.6c0-3.7-3-6.6-6.6-6.6H6.6c-3.7,0-6.6,3-6.6,6.6c0,3.7,3,6.6,6.6,6.6H190.4z M190.4,119.1c3.7,0,6.6-3,6.6-6.6s-3-6.6-6.6-6.6H6.6c-3.7,0-6.6,3-6.6,6.6s3,6.6,6.6,6.6H190.4z"
      />
    </svg>
  );
}

export default function Logo({
  variant = "dark",
  showWordmark = true,
  className = "",
}: {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
}) {
  const color = variant === "light" ? "text-white" : "text-pitch";
  return (
    <span className={`inline-flex items-center gap-2.5 ${color} ${className}`}>
      <CrownMark className="h-7 w-auto shrink-0" />
      {showWordmark && (
        <span className="font-semibold leading-none tracking-[0.18em] text-sm">
          IMPERIAL
          <br />
          CAPITAL
        </span>
      )}
    </span>
  );
}
