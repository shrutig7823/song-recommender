// Pulls songs released 2011-2025 from Spotify and saves them as new_songs.csv.
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
const TARGET = Number(process.argv[3] || 1500);
const OUT = "new_songs.csv";
const YEARS = Array.from({ length: 15 }, (_, i) => 2011 + i);
const GENRES = ["pop", "rock", "hip-hop", "r-n-b", "dance", "edm", "house", "techno", "latin", "reggaeton", "salsa",
  "k-pop", "indian", "bollywood", "indie", "alternative", "metal", "punk", "country", "folk", "acoustic",
  "singer-songwriter", "jazz", "blues", "classical", "ambient", "chill", "piano", "soul", "funk", "afrobeat",
  "j-pop", "trance", "dubstep", "drum-and-bass", "emo", "grunge", "disco", "gospel", "reggae"];
const PER_PAIR = 20;   // at most 20 songs per (genre, year), so the mix stays even

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
  for (const year of YEARS) for (const genre of GENRES) {
    let got = 0;
    for (let offset = 0; offset < PER_PAIR * 2 && got < PER_PAIR; offset += 10) {
      if (rows.length >= TARGET) { save(); console.log("Reached target:", rows.length); return finish(); }
      const items = await search(genre, year, offset);
      requests++;
      if (items === "quota") { save(); return finish(); }
      if (!items.length) break;
      for (const t of items) {
        if (!t || !t.name || !t.artists?.length || seenId.has(t.id)) continue;
        const artist = t.artists.map(a => a.name).join(";");
        const k = key(t.name, artist);
        if (seen.has(k)) continue;
        const date = t.album?.release_date || "";
        if (date && Number(date.slice(0, 4)) < 2011) continue;   // keep only 2011 onward
        seen.add(k); seenId.add(t.id); got++;
        rows.push({ track_name: t.name, artist, genre, album_name: t.album?.name || "", tags: "", description: "", language: "",
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
