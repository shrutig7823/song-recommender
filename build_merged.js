// Merges the original songs with the new Spotify songs and their labels.
// Writes:  songs_merged.csv, emotions/out/batch_new.json, context/out/batch_new.json
// Run:  node build_merged.js "C:\path\to\ALL_2000_Songs.csv"
const fs = require("fs");
const { readCsv } = require("./csv_util.js");

const original = readCsv(process.argv[2]);
const keptNew = readCsv("new_songs.csv");                          // indexes 2000 ...
const removedNew = JSON.parse(fs.readFileSync("new/removed_rows.json", "utf8"));   // indexes after those
const newRows = keptNew.concat(removedNew);

// labels written by the helpers, keyed by song index
const lab = {};
for (const f of fs.readdirSync("new/out")) for (const e of JSON.parse(fs.readFileSync("new/out/" + f, "utf8"))) lab[e.i] = e;

const EMO = new Set(["heartbreak", "sad", "nostalgic", "mellow", "romantic", "happy", "euphoric", "confident", "angry", "intense", "spiritual"]);
const THEME = new Set(["love", "heartbreak", "nostalgia", "party", "ambition", "struggle", "rebellion", "devotion", "freedom", "reflection"]);
const OCC = new Set(["party", "workout", "long drive", "romantic date", "wedding", "chill", "focus", "festival", "sleep", "prayer"]);
const LANG = new Set(["English", "Hindi", "Punjabi", "Spanish", "Korean", "Japanese", "Instrumental", "Other"]);

let bad = 0;
const emotions = [], context = [], rows = original.map(r => ({ ...r, release_date: "" }));
newRows.forEach((r, k) => {
  const i = 2000 + k, e = lab[i];
  if (!e || !EMO.has(e.p) || !EMO.has(e.s) || !THEME.has(e.theme) || !LANG.has(e.lang) || !e.occ?.length || !e.occ.every(o => OCC.has(o))) { bad++; return; }
  const year = Number((r.release_date || "").slice(0, 4)) || 2018;
  rows.push({ track_name: r.track_name, artist: r.artist, genre: r.genre, album_name: r.album_name,
    tags: (e.tags || []).join("; "), description: "", language: e.lang, release_date: r.release_date, spotify_id: r.spotify_id });
  const idx = rows.length - 1;                      // position in the merged list
  emotions.push({ i: idx, p: e.p, s: e.s, c: e.c });
  context.push({ i: idx, y: year, yc: "known", theme: e.theme, occ: e.occ, oc: e.oc });
});

const HEADER = ["track_name", "artist", "genre", "album_name", "tags", "description", "language", "release_date", "spotify_id"];
const q = t => '"' + String(t ?? "").replace(/"/g, '""') + '"';
fs.writeFileSync("songs_merged.csv", [HEADER.join(",")].concat(rows.map(r => HEADER.map(h => q(r[h])).join(","))).join("\n") + "\n");
fs.writeFileSync("emotions/out/batch_new.json", JSON.stringify(emotions));
fs.writeFileSync("context/out/batch_new.json", JSON.stringify(context));

const langs = {}; rows.slice(2000).forEach(r => langs[r.language] = (langs[r.language] || 0) + 1);
console.log(`merged ${rows.length} songs (${original.length} original + ${rows.length - original.length} new) | skipped as invalid or unlabelled: ${bad}`);
console.log("new songs by language:", langs);
