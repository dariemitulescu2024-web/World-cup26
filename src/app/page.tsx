"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrownMark } from "./Logo";

type Mode = "login" | "register";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe(d.player?.name ?? null))
      .finally(() => setLoaded(true));
  }, []);

  function digitsOnly(v: string) {
    return v.replace(/\D/g, "").slice(0, 4);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin.length !== 4) {
      setError("Your PIN must be 4 digits.");
      return;
    }
    if (mode === "register" && pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setBusy(true);
    const url = mode === "login" ? "/api/login" : "/api/register";
    const body = mode === "login" ? { name, pin } : { name, pin, code };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/predict");
  }

  if (!loaded) return null;

  if (me) {
    return (
      <div className="max-w-xl mx-auto text-center mt-10">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {me} 👋</h1>
        <p className="text-slate-600 mb-8">You&apos;re in the pool. Jump back in:</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/predict" className="bg-pitch text-white rounded-lg px-6 py-3 font-semibold hover:bg-pitch-dark">
            Make predictions
          </Link>
          <Link href="/bonus" className="bg-white border border-slate-300 rounded-lg px-6 py-3 font-semibold hover:bg-slate-50">
            Knockout picks
          </Link>
          <Link href="/leaderboard" className="bg-white border border-slate-300 rounded-lg px-6 py-3 font-semibold hover:bg-slate-50">
            Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError("");
      }}
      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
        mode === m ? "bg-pitch text-white" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="text-center mb-8">
        <CrownMark className="h-14 w-auto mx-auto text-pitch mb-3" />
        <p className="tracking-[0.25em] text-pitch font-semibold text-sm">IMPERIAL CAPITAL</p>
        <h1 className="text-3xl font-bold mt-3">World Cup 2026 Pool</h1>
        <p className="text-slate-600 mt-2">
          Pick a winner for every match, ride your favourites through the knockouts, and top the Imperial Capital leaderboard.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
          {tab("login", "Log in")}
          {tab("register", "Create account")}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">4-digit PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(digitsOnly(e.target.value))}
              inputMode="numeric"
              type="password"
              placeholder="••••"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-pitch"
            />
          </div>
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm PIN</label>
                <input
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
                  inputMode="numeric"
                  type="password"
                  placeholder="••••"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-pitch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Join code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ask the organizer"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch"
                />
              </div>
            </>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-pitch text-white rounded-lg px-4 py-2.5 font-semibold hover:bg-pitch-dark disabled:opacity-60"
          >
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
          <p className="text-xs text-slate-500 text-center">
            {mode === "login"
              ? "First time? Switch to Create account."
              : "Remember your PIN — it's how you log back in to edit picks."}
          </p>
        </form>
      </div>
    </div>
  );
}
