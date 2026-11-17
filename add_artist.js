// Step 1:  node add_artist.js append   -> appends artist_new.json to songs_merged.csv and writes ka_in.json for labelling
// Step 2:  node add_artist.js labels   -> reads ka_labels.json, writes the label batches and fills in tags and language
const fs = require("fs");
const { readCsv } = require("./csv_util.js");
const q = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
const COLS = ["track_name", "artist", "genre", "album_name", "tags", "description", "language", "release_date", "spotify_id"];
const mode = process.argv[2];
const text = fs.readFileSync("songs_merged.csv", "utf8");
if (mode === "append") {
  const base = readCsv("songs_merged.csv").length, add = JSON.parse(fs.readFileSync("artist_new.json", "utf8"));
  if (fs.existsSync("ka_in.json")) { console.log("already appended (ka_in.json exists)"); process.exit(0); }
  const lines = add.map(r => COLS.map(c => q({ ...r, tags: "", description: "", language: "Punjabi", spotify_id: "" }[c])).join(","));
  fs.writeFileSync("songs_merged.csv", text.replace(/\s*$/, "\n") + lines.join("\n") + "\n");
  fs.writeFileSync("ka_in.json", JSON.stringify(add.map((r, k) => ({ i: base + k, title: r.track_name, artists: r.artist.split(";").join(", "), album: r.album_name, year: Number(r.release_date.slice(0, 4)) })), null, 1));
  console.log("appended", add.length, "songs; first index", base);
} else if (mode === "labels") {
  const L = JSON.parse(fs.readFileSync("ka_labels.json", "utf8")), rows = readCsv("songs_merged.csv");
  const out = { emotions: [], context: [], popularity: [], vibe: [], trend: [] };
  for (const e of L) {
    out.emotions.push({ i: e.i, p: e.p, s: e.s, c: e.c });
    out.context.push({ i: e.i, y: e.y, yc: e.yc, theme: e.theme, occ: e.occ, oc: e.oc });
    out.popularity.push({ i: e.i, pop: e.pop, pc: e.pc });
    out.vibe.push({ i: e.i, style: e.style, film: e.film, reel: e.reel, sc: e.sc });
    out.trend.push({ i: e.i, now: e.now, kind: e.kind, sc: e.sc });
    rows[e.i].tags = (e.tags || []).join("; "); rows[e.i].language = e.lang || "Punjabi";
  }
  for (const [d, arr] of Object.entries(out)) fs.writeFileSync(d + "/out/batch_ka.json", JSON.stringify(arr));
  fs.writeFileSync("songs_merged.csv", COLS.join(",") + "\n" + rows.map(r => COLS.map(c => q(r[c])).join(",")).join("\n") + "\n");
  console.log("labels written for", L.length, "songs");
}
