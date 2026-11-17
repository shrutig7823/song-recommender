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
]);

const html = fs.readFileSync("page_template.html", "utf8").replace("/*DATA*/null", JSON.stringify(data));
fs.writeFileSync("song-recommender.html", html);
fs.writeFileSync("index.html", html);   // GitHub Pages serves index.html
console.log("Wrote song-recommender.html,", (html.length / 1024).toFixed(0), "KB");
