// Builds song-recommender.html: the page template + the cleaned songs data.
// Run:  node build_web.js "C:\path\to\ALL_2000_Songs.csv"
const fs = require("fs");
const { songs } = require("./step2_make_tags.js");

const labels = {};
for (const f of fs.readdirSync("emotions/out")) for (const e of JSON.parse(fs.readFileSync("emotions/out/" + f, "utf8"))) labels[e.i] = e;

const ctx = {};
for (const f of fs.readdirSync("context/out")) for (const e of JSON.parse(fs.readFileSync("context/out/" + f, "utf8"))) ctx[e.i] = e;

// popularity 1 (deep cut) to 5 (chart hit), rated per song; 3 if a song has no rating
const popularity = {};
if (fs.existsSync("popularity/out")) for (const f of fs.readdirSync("popularity/out")) for (const e of JSON.parse(fs.readFileSync("popularity/out/" + f, "utf8"))) popularity[e.i] = e.pop;

// style (what kind of song), film kind, and reel fame 1 to 5, labelled per song; unknown values fall back to safe defaults
const STYLES = new Set(["item-number", "classy-groove", "wedding-dance", "club-edm", "romantic-ballad", "soulful", "sad-ballad", "rap", "rock-band", "indie-acoustic", "retro", "devotional", "instrumental", "viral-pop", "other"]);
const FILMS = new Set(["romance", "comedy", "drama", "action", "thriller", "musical-dance", "biopic", "family-wedding", "horror", "none"]);
const vibe = {}; let vibeBad = 0;
if (fs.existsSync("vibe/out")) for (const f of fs.readdirSync("vibe/out")) for (const e of JSON.parse(fs.readFileSync("vibe/out/" + f, "utf8"))) vibe[e.i] = e;
const overrides = fs.existsSync("overrides.json") ? JSON.parse(fs.readFileSync("overrides.json", "utf8")) : {};
const keyOf = s => (s.track_name + "|" + s.artist.split(";")[0].trim()).toLowerCase();
const vibeOf = i => { const e = { ...(vibe[i] || {}), ...(overrides[keyOf(songs[i])] || {}) }; if (!STYLES.has(e.style) || !FILMS.has(e.film) || !(e.reel >= 1 && e.reel <= 5)) { vibeBad++; return { style: STYLES.has(e.style) ? e.style : "other", film: FILMS.has(e.film) ? e.film : "none", reel: e.reel >= 1 && e.reel <= 5 ? e.reel : 2 }; } return e; };

const data = songs.map((s, i) => [
  s.track_name,
  s.artist.split(";").map(a => a.trim()).filter(Boolean).join(", "),
  s.genre,
  s.tags_text,
  s.language,
  labels[i].p,
  labels[i].s,
  ctx[i].y,
  ctx[i].theme,
  ctx[i].occ,
  s.spotify_id || "",
  popularity[i] || 3,
  vibeOf(i).style,
  vibeOf(i).film,
  vibeOf(i).reel,
]);
console.log("vibe labels:", Object.keys(vibe).length, "| values that needed a default:", vibeBad);

const html = fs.readFileSync("page_template.html", "utf8").replace("/*DATA*/null", JSON.stringify(data));
fs.writeFileSync("song-recommender.html", html);
fs.writeFileSync("index.html", html);   // GitHub Pages serves index.html
console.log("Wrote song-recommender.html,", (html.length / 1024).toFixed(0), "KB");
