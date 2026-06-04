// 2026 FIFA World Cup teams + groups (from the Dec 2025 final draw) and flag helpers.

// ISO-3166 alpha-2 per team (used to build flag emoji). England/Scotland use sub-tags.
const TEAM_ISO: Record<string, string> = {
  Mexico: "MX",
  "South Africa": "ZA",
  "South Korea": "KR",
  "Czech Republic": "CZ",
  Canada: "CA",
  "Bosnia and Herzegovina": "BA",
  Qatar: "QA",
  Switzerland: "CH",
  Brazil: "BR",
  Morocco: "MA",
  Haiti: "HT",
  Scotland: "GB-SCT",
  "United States": "US",
  Paraguay: "PY",
  Australia: "AU",
  Turkey: "TR",
  Germany: "DE",
  "Curaçao": "CW",
  "Ivory Coast": "CI",
  Ecuador: "EC",
  Netherlands: "NL",
  Japan: "JP",
  Sweden: "SE",
  Tunisia: "TN",
  Belgium: "BE",
  Egypt: "EG",
  Iran: "IR",
  "New Zealand": "NZ",
  Spain: "ES",
  "Cape Verde": "CV",
  "Saudi Arabia": "SA",
  Uruguay: "UY",
  France: "FR",
  Senegal: "SN",
  Iraq: "IQ",
  Norway: "NO",
  Argentina: "AR",
  Algeria: "DZ",
  Austria: "AT",
  Jordan: "JO",
  Portugal: "PT",
  "DR Congo": "CD",
  Uzbekistan: "UZ",
  Colombia: "CO",
  England: "GB-ENG",
  Croatia: "HR",
  Ghana: "GH",
  Panama: "PA",
};

export const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const ALL_TEAMS: string[] = Object.values(GROUPS).flat().sort();

/**
 * flagcdn.com country code for a team (lowercase, e.g. "mx", "gb-eng"), or null
 * for knockout placeholders. Used to render real flag images (emoji flags don't
 * render on Windows).
 */
export function iso(team: string | null | undefined): string | null {
  if (!team) return null;
  const code = TEAM_ISO[team];
  return code ? code.toLowerCase() : null;
}

/** Flag emoji for a team name. Returns 🏳️ for unknown / knockout placeholders. */
export function flag(team: string | null | undefined): string {
  if (!team) return "🏳️";
  const iso = TEAM_ISO[team];
  if (!iso) return "🏳️"; // placeholders like "Winner Group A"
  if (iso === "GB-ENG") return "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
  if (iso === "GB-SCT") return "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (iso.charCodeAt(0) - 65),
    A + (iso.charCodeAt(1) - 65),
  );
}
