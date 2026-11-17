// Pulls Hindi, Punjabi and English songs released 2010-2026 from Spotify and saves them as new_songs.csv.
//
// Before running, set your Spotify app's keys in YOUR terminal (never paste them into chat):
//   PowerShell:  $env:SPOTIFY_CLIENT_ID="your id";  $env:SPOTIFY_CLIENT_SECRET="your secret"
// Then run:
//   node pull_spotify.js "C:\path\to\ALL_2000_Songs.csv" [target]
//
// - Uses the "client credentials" login, so no Spotify user login is needed.
// - Searches many (genre, year) pairs, 10 songs at a time (Spotify's current limit for new apps).
// - Skips songs already in your CSV and duplicates. Safe to stop and run again: it resumes.
// - Stops at the target (default 1500) or when Spotify says the quota is used up.

const fs = require("fs");

const ID = process.env.SPOTIFY_CLIENT_ID, SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!ID || !SECRET) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in this terminal first (see the top of this file).");
  process.exit(1);
}
const EXISTING = process.argv[2];
const TARGET = Number(process.argv[3] || 2000);
const OUT = "new_songs.csv";
const YEARS = Array.from({ length: 17 }, (_, i) => 2010 + i);   // 2010 to 2026

// Only Hindi, Punjabi and English. Spotify has no "language" filter, so we search genres that belong to each
// language, and a later labelling step confirms the language of every song (anything else is dropped).
// cap = most songs kept per (genre, year), so the three languages stay balanced.
const QUERIES = [
  ...["bollywood", "filmi", "modern bollywood", "hindi indie", "indian indie", "desi hip hop", "hindi hip hop", "sufi"]
    .map(g => ({ g, lang: "Hindi", cap: 8 })),
  ...["punjabi pop", "punjabi hip hop", "bhangra", "desi pop", "punjabi folk", "punjabi"]
    .map(g => ({ g, lang: "Punjabi", cap: 8 })),
  // classics, for the "Qawwali and get-togethers" and "Ghazals and old Bollywood" moments: older years, so a lower minYear
  ...["ghazal", "classic bollywood", "qawwali", "sufi"]
    .map(g => ({ g, lang: "Hindi", cap: 6, minYear: 1950, years: ["1950-1969", "1970-1979", "1980-1989", "1990-1999", "2000-2009"] })),
  ...["pop", "rock", "hip hop", "r&b", "dance pop", "indie pop", "alternative rock", "edm", "country", "soul",
      "singer-songwriter", "folk", "metal", "punk", "house", "pop rap", "trap", "acoustic"]
    .map(g => ({ g, lang: "English", cap: 3 })),
];

const q = t => '"' + String(t ?? "").replace(/"/g, '""') + '"';
function readCsv(path) {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = []; let row = [], f = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') inQ = false; else f += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const h = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
}
const key = (title, artist) => (title + "|" + artist.split(";")[0]).toLowerCase().replace(/[^\p{L}\p{N}|]/gu, "");

// ---- what we already have ----
const seen = new Set(), seenId = new Set();
if (EXISTING) readCsv(EXISTING).forEach(s => seen.add(key(s.track_name, s.artist)));
const HEADER = ["track_name", "artist", "genre", "album_name", "tags", "description", "language", "release_date", "spotify_id", "spotify_url"];
let rows = [];
if (fs.existsSync(OUT)) {
  rows = readCsv(OUT);
  rows.forEach(r => { seenId.add(r.spotify_id); seen.add(key(r.track_name, r.artist)); });
  console.log("Resuming with", rows.length, "songs already saved in", OUT);
}
const save = () => fs.writeFileSync(OUT, [HEADER.join(",")].concat(rows.map(r => HEADER.map(h => q(r[h])).join(","))).join("\n") + "\n");

// ---- Spotify ----
let token = "", tokenExpires = 0;
async function getToken() {
  if (Date.now() < tokenExpires - 60000) return token;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(ID + ":" + SECRET).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) { console.error("Spotify login failed:", r.status, await r.text()); process.exit(1); }
  const j = await r.json(); token = j.access_token; tokenExpires = Date.now() + j.expires_in * 1000;
  return token;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(genre, year, offset) {
  const url = "https://api.spotify.com/v1/search?type=track&limit=10&offset=" + offset +
    "&q=" + encodeURIComponent(`genre:"${genre}" year:${year}`);
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + (await getToken()) } });
    if (r.status === 429) {
      const wait = Number(r.headers.get("retry-after") || 5);
      if (wait > 120) { console.log("Spotify quota used up (asked us to wait " + wait + "s). Saved so far; run again later."); return "quota"; }
      console.log("Rate limited, waiting", wait, "s"); await sleep((wait + 1) * 1000); continue;
    }
    if (!r.ok) { console.log("  skipped", genre, year, offset, "->", r.status, (await r.text()).slice(0, 120)); return []; }
    return (await r.json()).tracks?.items || [];
  }
  return [];
}

(async () => {
  let requests = 0;
  // every (year, genre) pair in a fixed random order, so stopping at any point still gives an even mix of years and genres
  const pairs = [];
  for (const qy of QUERIES) for (const y of (qy.years || YEARS)) pairs.push([y, qy]);
  let seed = 12345;
  for (let i = pairs.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const k = seed % (i + 1);
    [pairs[i], pairs[k]] = [pairs[k], pairs[i]];
  }
  for (const [year, { g: genre, lang, cap, minYear }] of pairs) {
    let got = 0;
    for (let offset = 0; offset < 50 && got < cap; offset += 10) {
      if (rows.length >= TARGET) { save(); console.log("Reached target:", rows.length); return finish(); }
      const items = await search(genre, year, offset);
      requests++;
      if (items === "quota") { save(); return finish(); }
      if (!items.length) break;
      for (const t of items) {
        if (got >= cap) break;
        if (!t || !t.name || !t.artists?.length || seenId.has(t.id)) continue;
        const artist = t.artists.map(a => a.name).join(";");
        const k = key(t.name, artist);
        if (seen.has(k)) continue;
        const date = t.album?.release_date || "";
        if (date && Number(date.slice(0, 4)) < (minYear || 2010)) continue;   // 2010 onward, or older for the classics queries
        seen.add(k); seenId.add(t.id); got++;
        rows.push({ track_name: t.name, artist, genre, album_name: t.album?.name || "", tags: "", description: "", language: lang,
          release_date: date, spotify_id: t.id, spotify_url: t.external_urls?.spotify || "" });
      }
      await sleep(250);
    }
    if (requests % 20 === 0) { save(); console.log(`${rows.length} songs so far (year ${year}, genre ${genre})`); }
  }
  save(); finish();

  function finish() {
    const byGenre = {}, byYear = {};
    rows.forEach(r => { byGenre[r.genre] = (byGenre[r.genre] || 0) + 1; byYear[r.release_date.slice(0, 4)] = (byYear[r.release_date.slice(0, 4)] || 0) + 1; });
    console.log("\nDone. Saved", rows.length, "songs to", OUT);
    console.log("By year:", byYear); console.log("By genre:", byGenre);
  }
})();
